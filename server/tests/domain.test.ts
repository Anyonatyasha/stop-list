import { describe, it, expect } from 'vitest';
import { calculateExpiresAt, getMinutesLeft, getStatus, isActive, type StopListEntry } from '../src/domain';

const makeEntry = (overrides: Partial<StopListEntry> = {}): StopListEntry => ({
  id: 'e1',
  dishId: 'd1',
  reason: 'Закончилась говядина',
  stoppedAt: '2026-11-10T10:00:00.000Z',
  expiresAt: '2026-11-10T11:00:00.000Z',
  returnedAt: null,
  ...overrides,
});

describe('calculateExpiresAt', () => {
  it('прибавляет длительность в минутах к времени постановки', () => {
    const stoppedAt = new Date('2026-11-10T10:00:00.000Z');
    const result = calculateExpiresAt(stoppedAt, 30);
    expect(result).toBe('2026-11-10T10:30:00.000Z');
  });
});


describe('isActive', () => {
  it('возвращает false, если блюдо вернули, даже когда срок не вышел', () => {
    const entry = makeEntry({ returnedAt: '2026-11-10T10:20:00.000Z' });
    expect(isActive(entry, new Date('2026-11-10T10:30:00.000Z'))).toBe(false);
  });

  it('возвращает false, если срок вышел, даже когда блюдо не вернули', () => {
    const entry = makeEntry({ expiresAt: '2026-11-10T10:30:00.000Z' });
    expect(isActive(entry, new Date('2026-11-10T10:31:00.000Z'))).toBe(false);
  });

  it('возвращает true, если блюдо не вернули и срок не вышел', () => {
    const entry = makeEntry({ expiresAt: '2026-11-10T10:30:00.000Z' });
    expect(isActive(entry, new Date('2026-11-10T10:29:00.000Z'))).toBe(true);
  });

  it('ровно в момент истечения срока возвращает false', () => {
    const entry = makeEntry({ expiresAt: '2026-11-10T10:30:00.000Z' });
    expect(isActive(entry, new Date('2026-11-10T10:30:00.000Z'))).toBe(false);
  });
});

describe('getStatus', () => {
  it('возвращает "returned", если блюдо вернули', () => {
    const entry = makeEntry({ returnedAt: '2026-11-10T10:20:00.000Z' });
    expect(getStatus(entry, new Date('2026-11-10T10:30:00.000Z'))).toBe('returned');
  });

  it('возвращает "expired", если срок вышел и блюдо не вернули', () => {
    const entry = makeEntry({ expiresAt: '2026-11-10T10:30:00.000Z' });
    expect(getStatus(entry, new Date('2026-11-10T10:31:00.000Z'))).toBe('expired');
  });

  it('возвращает "active", если блюдо не вернули и срок не вышел', () => {
    const entry = makeEntry({ expiresAt: '2026-11-10T10:30:00.000Z' });
    expect(getStatus(entry, new Date('2026-11-10T10:29:00.000Z'))).toBe('active');
  });

  it('остаётся "returned", даже когда срок потом тоже прошёл', () => {
    const entry = makeEntry({ returnedAt: '2026-11-10T10:20:00.000Z' }); // срок по умолчанию 11:00
    expect(getStatus(entry, new Date('2026-11-10T11:30:00.000Z'))).toBe('returned');
  });
});

describe('getMinutesLeft', () => {
  it('возвращает 0, если блюдо вернули', () => {
    const entry = makeEntry({ returnedAt: '2026-11-10T10:20:00.000Z' });
    expect(getMinutesLeft(entry, new Date('2026-11-10T10:30:00.000Z'))).toBe(0);
  });

  it('возвращает 0, если срок вышел и блюдо не вернули', () => {
    const entry = makeEntry({ expiresAt: '2026-11-10T10:30:00.000Z' });
    expect(getMinutesLeft(entry, new Date('2026-11-10T10:31:00.000Z'))).toBe(0);
  });

  it('возвращает количество минут до истечения срока, если блюдо не вернули и срок не вышел', () => {
    const entry = makeEntry({ expiresAt: '2026-11-10T10:30:00.000Z' });
    expect(getMinutesLeft(entry, new Date('2026-11-10T10:29:00.000Z'))).toBe(1);
  });

  it('возвращает 1, если ровно 10 секунд до истечения срока', () => {
    const entry = makeEntry({ expiresAt: '2026-11-10T10:30:00.000Z' });
    expect(getMinutesLeft(entry, new Date('2026-11-10T10:29:50.000Z'))).toBe(1);
  });
});