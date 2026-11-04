import { ConflictError, NotFoundError } from './errors';
import {
  calculateExpiresAt,
  getCompletionTime,
  isActive,
  toView,
  type CreateStopEntryInput,
  type Dish,
  type DishCategory,
  type StopListEntry,
  type StopListEntryView,
} from './domain';
import type { DishRepo, StopListRepo } from './repository';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface StopListService {
  stopDish(input: CreateStopEntryInput): Promise<StopListEntryView>;
  listActive(category?: DishCategory): Promise<StopListEntryView[]>;
  returnDish(id: string): Promise<StopListEntryView>;
  getHistory(limit: number, offset: number): Promise<PaginatedResult<StopListEntryView>>;
}

export const createStopListService = (deps: {
  stopList: StopListRepo;
  dishes: DishRepo;
  now: () => Date;
}): StopListService => {
  const { stopList, dishes, now } = deps;

  const requireDish = async (dishId: string): Promise<Dish> => {
    const dish = await dishes.findById(dishId);
    if (!dish) throw new NotFoundError(`Блюдо ${dishId} не найдено`, 'DISH_NOT_FOUND');
    return dish;
  };

  const buildView = async (entry: StopListEntry, currentTime: Date): Promise<StopListEntryView> => {
    const dish = await requireDish(entry.dishId);
    return toView(entry, dish, currentTime);
  };

  return {
    stopDish: async (input) => {
      const dish = await requireDish(input.dishId);
      const currentTime = now();

      const existing = await stopList.findByDishId(input.dishId);
      if (existing.some((entry) => isActive(entry, currentTime))) {
        throw new ConflictError('Блюдо уже в стоп-листе', 'DISH_ALREADY_STOPPED');
      }

      const entry = await stopList.create({
        dishId: dish.id,
        reason: input.reason,
        stoppedAt: currentTime.toISOString(),
        expiresAt: calculateExpiresAt(currentTime, input.durationMinutes),
        returnedAt: null,
      });

      return toView(entry, dish, currentTime);
    },

    listActive: async (category) => {
      const currentTime = now();
      const entries = await stopList.findAll();
      const active = entries.filter((entry) => isActive(entry, currentTime));
      const views = await Promise.all(active.map((entry) => buildView(entry, currentTime)));
      return category ? views.filter((v) => v.dish.category === category) : views;
    },

    returnDish: async (id) => {
      const currentTime = now();
      const entry = await stopList.findById(id);
      if (!entry) throw new NotFoundError(`Запись ${id} не найдена`, 'ENTRY_NOT_FOUND');
      if (!isActive(entry, currentTime)) {
        throw new ConflictError('Запись уже возвращена или истекла', 'ENTRY_NOT_ACTIVE');
      }
      const updated = await stopList.setReturned(id, currentTime.toISOString());
      return buildView(updated ?? entry, currentTime);
    },

    getHistory: async (limit, offset) => {
      const currentTime = now();
      const entries = await stopList.findAll();
      const finished = entries
        .filter((entry) => !isActive(entry, currentTime))
        .sort((a, b) => getCompletionTime(b) - getCompletionTime(a));

      const page = finished.slice(offset, offset + limit);
      const items = await Promise.all(page.map((entry) => buildView(entry, currentTime)));
      return { items, total: finished.length, limit, offset };
    },
  };
};
