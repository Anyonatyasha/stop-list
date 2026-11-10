export type DishCategory = 'Кухня' | 'Бар' | 'Десерты';

export interface Dish {
  id: string;
  name: string;
  category: DishCategory;
  price: number;
}

export type StopListStatus = 'active' | 'returned' | 'expired';

export interface StopListEntryView {
  id: string;
  dishId: string;
  reason: string;
  stoppedAt: string;
  expiresAt: string;
  returnedAt: string | null;
  dish: Dish;
  status: StopListStatus;
  minutesLeft: number;
}

export interface CreateStopEntryInput {
  dishId: string;
  reason: string;
  durationMinutes: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}