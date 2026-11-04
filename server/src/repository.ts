import { randomUUID } from 'node:crypto';
import type { Dish, StopListEntry } from './domain';

export interface DishRepo {
  findAll(): Promise<Dish[]>;
  findById(id: string): Promise<Dish | null>;
}

export interface StopListRepo {
  create(data: Omit<StopListEntry, 'id'>): Promise<StopListEntry>;
  findAll(): Promise<StopListEntry[]>;
  findById(id: string): Promise<StopListEntry | null>;
  findByDishId(dishId: string): Promise<StopListEntry[]>;
  setReturned(id: string, returnedAt: string): Promise<StopListEntry | null>;
}

const seedDishes: Dish[] = [
  { id: 'd1', name: 'Борщ с говядиной', category: 'Кухня', price: 420 },
  { id: 'd2', name: 'Плов с бараниной', category: 'Кухня', price: 480 },
  { id: 'd3', name: 'Стейк из лосося', category: 'Кухня', price: 890 },
  { id: 'd4', name: 'Паста Карбонара', category: 'Кухня', price: 520 },
  { id: 'd5', name: 'Цезарь с курицей', category: 'Кухня', price: 390 },
  { id: 'd6', name: 'Утиная грудка с овощами', category: 'Кухня', price: 750 },
  { id: 'd7', name: 'Мохито', category: 'Бар', price: 350 },
  { id: 'd8', name: 'Апероль Шпритц', category: 'Бар', price: 480 },
  { id: 'd9', name: 'Лимонад домашний', category: 'Бар', price: 250 },
  { id: 'd10', name: 'Капучино', category: 'Бар', price: 220 },
  { id: 'd11', name: 'Тирамису', category: 'Десерты', price: 340 },
  { id: 'd12', name: 'Чизкейк Нью-Йорк', category: 'Десерты', price: 380 },
  { id: 'd13', name: 'Наполеон', category: 'Десерты', price: 310 },
];

export const createInMemoryDishRepo = (): DishRepo => ({
  findAll: async () => [...seedDishes],
  findById: async (id) => seedDishes.find((d) => d.id === id) ?? null,
});

export const createInMemoryStopListRepo = (): StopListRepo => {
  const entries: StopListEntry[] = [];

  return {
    create: async (data) => {
      const entry: StopListEntry = { id: randomUUID(), ...data };
      entries.push(entry);
      return entry;
    },
    findAll: async () => [...entries],
    findById: async (id) => entries.find((e) => e.id === id) ?? null,
    findByDishId: async (dishId) => entries.filter((e) => e.dishId === dishId),
    setReturned: async (id, returnedAt) => {
      const entry = entries.find((e) => e.id === id);
      if (!entry) return null;
      entry.returnedAt = returnedAt;
      return entry;
    },
  };
};
