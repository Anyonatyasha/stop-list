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
});
