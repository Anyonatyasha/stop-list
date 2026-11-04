import type { CreateStopEntryInput, Dish, StopListEntryView } from './types';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const request = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.error?.code ?? 'UNKNOWN_ERROR', body?.error?.message ?? 'Ошибка сервера');
  }
  return res.json() as Promise<T>;
};

export const fetchDishes = () => request<Dish[]>('/dishes');
export const fetchActiveStopList = () => request<StopListEntryView[]>('/stop-list');

export const createStopEntry = (input: CreateStopEntryInput) =>
  request<StopListEntryView>('/stop-list', { method: 'POST', body: JSON.stringify(input) });

export const returnStopEntry = (id: string) =>
  request<StopListEntryView>(`/stop-list/${encodeURIComponent(id)}/return`, { method: 'PATCH' });
