export type DishCategory = 'Кухня' | 'Бар' | 'Десерты';
export const CATEGORIES: DishCategory[] = ['Кухня', 'Бар', 'Десерты'];

export interface Dish {
  id: string;
  name: string;
  category: DishCategory;
  price: number;
}

export interface StopListEntry {
  id: string;
  dishId: string;
  reason: string;
  stoppedAt: string;
  expiresAt: string;
  returnedAt: string | null;
}

export type StopListStatus = 'active' | 'returned' | 'expired';

export type StopListEntryView = StopListEntry & {
  dish: Dish;
  status: StopListStatus;
  minutesLeft: number;
};

export interface CreateStopEntryInput {
  dishId: string;
  reason: string;
  durationMinutes: number;
}

export const isActive = (entry: StopListEntry, now: Date): boolean =>
  entry.returnedAt === null && new Date(entry.expiresAt).getTime() > now.getTime();

export const getStatus = (entry: StopListEntry, now: Date): StopListStatus => {
  if (entry.returnedAt !== null) return 'returned';
  return isActive(entry, now) ? 'active' : 'expired';
};

export const getMinutesLeft = (entry: StopListEntry, now: Date): number =>
  isActive(entry, now) ? Math.ceil((new Date(entry.expiresAt).getTime() - now.getTime()) / 60_000) : 0;

export const calculateExpiresAt = (stoppedAt: Date, durationMinutes: number): string =>
  new Date(stoppedAt.getTime() + durationMinutes * 60_000).toISOString();

export const toView = (entry: StopListEntry, dish: Dish, now: Date): StopListEntryView => ({
  ...entry,
  dish,
  status: getStatus(entry, now),
  minutesLeft: getMinutesLeft(entry, now),
});

export const getCompletionTime = (entry: StopListEntry): number =>
  new Date(entry.returnedAt ?? entry.expiresAt).getTime();

export interface FieldErrors {
  [field: string]: string;
}

export const validateCreateStopEntry = (
  body: unknown,
): { errors: FieldErrors; value?: CreateStopEntryInput } => {
  const b = (body ?? {}) as Record<string, unknown>;

  const dishId = typeof b.dishId === 'string' ? b.dishId.trim() : '';
  const reason = typeof b.reason === 'string' ? b.reason.trim() : '';
  const duration = b.durationMinutes;
  const isValidDuration = typeof duration === 'number' && Number.isInteger(duration);

  const checks: [string, string | undefined][] = [
    ['dishId', dishId ? undefined : 'dishId обязателен'],
    [
      'reason',
      reason.length >= 5 && reason.length <= 200 ? undefined : 'reason должен содержать от 5 до 200 символов',
    ],
    [
      'durationMinutes',
      !isValidDuration
        ? 'durationMinutes должен быть целым числом'
        : duration < 15 || duration > 720
          ? 'durationMinutes должен быть от 15 до 720'
          : undefined,
    ],
  ];

  const errors = Object.fromEntries(checks.filter(([, message]) => message !== undefined)) as FieldErrors;
  if (Object.keys(errors).length > 0) return { errors };
  return { errors, value: { dishId, reason, durationMinutes: duration as number } };
};

const parseIntParam = (
  raw: unknown,
  min: number,
  max: number,
  fallback: number,
): number | undefined => {
  if (raw === undefined) return fallback;
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) return undefined;
  const num = Number(raw);
  return num >= min && num <= max ? num : undefined;
};

export const validatePagination = (
  query: Record<string, unknown>,
): { errors: FieldErrors; value?: { limit: number; offset: number } } => {
  const specs = [
    { name: 'limit', raw: query.limit, min: 1, max: 100, fallback: 20 },
    { name: 'offset', raw: query.offset, min: 0, max: Number.MAX_SAFE_INTEGER, fallback: 0 },
  ] as const;

  const parsed = specs.map((spec) => ({ ...spec, value: parseIntParam(spec.raw, spec.min, spec.max, spec.fallback) }));

  const errors = Object.fromEntries(
    parsed
      .filter((p) => p.value === undefined)
      .map((p) => [p.name, `${p.name} должен быть целым числом от ${p.min} до ${p.max}`]),
  ) as FieldErrors;

  if (Object.keys(errors).length > 0) return { errors };
  const [limit, offset] = parsed.map((p) => p.value as number);
  return { errors, value: { limit, offset } };
};

export const validateCategory = (raw: unknown): { error?: string; value?: DishCategory } => {
  if (raw === undefined) return {};
  if (typeof raw === 'string' && CATEGORIES.includes(raw as DishCategory)) {
    return { value: raw as DishCategory };
  }
  return { error: 'Некорректная категория' };
};
