import { describe, it, expect, beforeEach } from 'vitest';
import { createInMemoryDishRepo, createInMemoryStopListRepo } from '../src/repository';
import { createStopListService, type StopListService } from '../src/service';

const MINUTE = 60000;

describe('StopListService', () => {
  let currentTime: Date;
  let service: StopListService;

  const advance = (minutes: number) => {
    currentTime = new Date(currentTime.getTime() + minutes * MINUTE);
  };

  beforeEach(() => {
    currentTime = new Date('2026-11-10T10:00:00.000Z');
    service = createStopListService({
      stopList: createInMemoryStopListRepo(),
      dishes: createInMemoryDishRepo(),
      now: () => currentTime,
    });
  });

  describe('stopDish', () => {
    it('ставит блюдо в стоп и считает срок', async () => {
      const entry = await service.stopDish({ dishId: 'd1', reason: 'Закончилась говядина', durationMinutes: 30 });

      expect(entry.status).toBe('active');
      expect(entry.expiresAt).toBe('2026-11-10T10:30:00.000Z');
      expect(entry.dish.name).toBe('Борщ с говядиной');
    });

    it('отклоняет блюдо, которого нет в справочнике', async () => {
      await expect(
        service.stopDish({ dishId: 'нет-такого', reason: 'Проверка', durationMinutes: 30 }),
      ).rejects.toMatchObject({ code: 'DISH_NOT_FOUND' });
    });

    it('отклоняет повторную постановку того же блюда', async () => {
      await service.stopDish({ dishId: 'd1', reason: 'Закончилась говядина', durationMinutes: 30 });
      await expect(
        service.stopDish({ dishId: 'd1', reason: 'Проверка', durationMinutes: 30 }),
      ).rejects.toMatchObject({ code: 'DISH_ALREADY_STOPPED' });
    });

    it('позволяет снова поставить блюдо после истечения срока', async () => {
      await service.stopDish({ dishId: 'd1', reason: 'Закончилась говядина', durationMinutes: 30 });
      advance(31);
      const entry = await service.stopDish({ dishId: 'd1', reason: 'Проверка', durationMinutes: 30 });
      expect(entry.status).toBe('active');
    });
  });

  describe('listActive', () => {
    it('показывает блюдо, поставленное в стоп', async () => {
      await service.stopDish({ dishId: 'd1', reason: 'Закончилась говядина', durationMinutes: 30 });
      const list = await service.listActive();
      expect(list).toHaveLength(1);
      expect(list[0].dish.name).toBe('Борщ с говядиной');
    });

    it('не показывает блюдо после истечения срока', async () => {
      await service.stopDish({ dishId: 'd1', reason: 'Закончилась говядина', durationMinutes: 30 });
      advance(31);
      const list = await service.listActive();
      expect(list).toHaveLength(0);
    });

    it('фильтрует по категории', async () => {
      await service.stopDish({ dishId: 'd1', reason: 'Закончилась говядина', durationMinutes: 30 });
      await service.stopDish({ dishId: 'd7', reason: 'Закончился мохито', durationMinutes: 30 });
      const list = await service.listActive('Бар');
      expect(list).toHaveLength(1);
      expect(list[0].dish.name).toBe('Мохито');
    });
  });

  describe('returnDish', () => {
    it('возвращает блюдо в продажу', async () => {
      const entry = await service.stopDish({ dishId: 'd1', reason: 'Закончилась говядина', durationMinutes: 30 });
      advance(10);
      const returnedEntry = await service.returnDish(entry.id);
      expect(returnedEntry.status).toBe('returned');
      expect(returnedEntry.returnedAt).toBe('2026-11-10T10:10:00.000Z');
    });

    it('отклоняет несуществующую запись', async () => {
      await expect(service.returnDish('нет-такого')).rejects.toMatchObject({ code: 'ENTRY_NOT_FOUND' });
    });

    it('отклоняет повторный возврат', async () => {
      const entry = await service.stopDish({ dishId: 'd1', reason: 'Закончилась говядина', durationMinutes: 30 });
      await service.returnDish(entry.id);
      await expect(service.returnDish(entry.id)).rejects.toMatchObject({ code: 'ENTRY_NOT_ACTIVE' });
    });

    it('отклоняет возврат после истечения срока', async () => {
      const entry = await service.stopDish({ dishId: 'd1', reason: 'Закончилась говядина', durationMinutes: 30 });
      advance(31);
      await expect(service.returnDish(entry.id)).rejects.toMatchObject({ code: 'ENTRY_NOT_ACTIVE' });
    });
  });

  describe('getHistory', () => {
    it('не включает активные записи', async () => {
      await service.stopDish({ dishId: 'd1', reason: 'Закончилась говядина', durationMinutes: 30 });
      const history = await service.getHistory(10, 0);
      expect(history.items).toHaveLength(0);
      expect(history.total).toBe(0);
    });

    it('включает возвращённые и истёкшие записи', async () => {
      const entry1 = await service.stopDish({ dishId: 'd1', reason: 'Закончилась говядина', durationMinutes: 30 });
      await service.stopDish({ dishId: 'd7', reason: 'Закончился мохито', durationMinutes: 30 });

      advance(10);
      await service.returnDish(entry1.id);
      advance(30);  
      const history = await service.getHistory(10, 0);
      expect(history.total).toBe(2);
    });

    it('сортирует от новых к старым', async () => {
      const entry1 = await service.stopDish({ dishId: 'd1', reason: 'Закончилась говядина', durationMinutes: 30 });
      await service.stopDish({ dishId: 'd7', reason: 'Закончился мохито', durationMinutes: 60 });

      advance(10);                        
      await service.returnDish(entry1.id); 

      advance(55);                       

      const history = await service.getHistory(10, 0);
      expect(history.items[0].dishId).toBe('d7');
      expect(history.items[1].dishId).toBe('d1');
    });

    it('делит историю на страницы', async () => {
      const entry1 = await service.stopDish({ dishId: 'd1', reason: 'Закончилась говядина', durationMinutes: 30 });
      const entry2 = await service.stopDish({ dishId: 'd2', reason: 'Закончилась баранина', durationMinutes: 30 });
      const entry3 = await service.stopDish({ dishId: 'd3', reason: 'Закончился лосось', durationMinutes: 30 });

      advance(1);
      await service.returnDish(entry1.id);
      advance(1);
      await service.returnDish(entry2.id);
      advance(1);
      await service.returnDish(entry3.id);

      const page1 = await service.getHistory(2, 0);
      expect(page1.items).toHaveLength(2);
      expect(page1.total).toBe(3);

      const page2 = await service.getHistory(2, 2);
      expect(page2.items).toHaveLength(1);
      expect(page2.total).toBe(3);
    });
  });
});
