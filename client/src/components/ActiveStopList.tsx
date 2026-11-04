import { useEffect, useState } from 'react';
import type { DishCategory, StopListEntryView } from '../types';

interface Props {
  entries: StopListEntryView[];
  now: Date;
  category: DishCategory | '';
  onCategoryChange: (c: DishCategory | '') => void;
  onReturn: (id: string) => void;
  returningId: string | null;
}

const CATEGORIES: DishCategory[] = ['Кухня', 'Бар', 'Десерты'];
const EXIT_DURATION_MS = 200;

const formatCountdown = (msLeft: number): string => {
  const totalSeconds = Math.max(0, Math.floor(msLeft / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const ActiveStopList = ({ entries, now, category, onCategoryChange, onReturn, returningId }: Props) => {
  const [rows, setRows] = useState<{ entry: StopListEntryView; leaving: boolean }[]>([]);

  useEffect(() => {
    const currentIds = new Set(entries.map((e) => e.id));

    setRows((prev) => {
      const stillHere = prev.map((row) =>
        currentIds.has(row.entry.id) ? row : { ...row, leaving: true },
      );
      const knownIds = new Set(prev.map((row) => row.entry.id));
      const added = entries.filter((e) => !knownIds.has(e.id)).map((entry) => ({ entry, leaving: false }));
      return [...stillHere, ...added];
    });

    const leavingIds = rows.filter((r) => !currentIds.has(r.entry.id)).map((r) => r.entry.id);
    if (leavingIds.length > 0) {
      const timer = setTimeout(() => {
        setRows((prev) => prev.filter((row) => currentIds.has(row.entry.id)));
      }, EXIT_DURATION_MS);
      return () => clearTimeout(timer);
    }

  }, [entries]);

  const visibleRows = rows.filter((r) => new Date(r.entry.expiresAt).getTime() > now.getTime() || r.leaving);

  return (
    <div className="active-stop-list">
      <div className="active-stop-list__header">
        <h2 className="section-title">Активный стоп-лист</h2>
        <select
          className="input input--select-small"
          value={category}
          onChange={(e) => onCategoryChange(e.target.value as DishCategory | '')}
        >
          <option value="">Все категории</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {visibleRows.length === 0 && <p className="empty-state">Все блюда в продаже</p>}

      {visibleRows.length > 0 && (
        <ul className="stop-card-list">
          {visibleRows.map(({ entry, leaving }) => {
            const msLeft = new Date(entry.expiresAt).getTime() - now.getTime();
            return (
              <li key={entry.id} className={leaving ? 'stop-card stop-card--leaving' : 'stop-card'}>
                <div className="stop-card__header">
                  <span className="stop-card__dish">{entry.dish.name}</span>
                  <span className="stop-card__category">{entry.dish.category}</span>
                </div>
                <p className="stop-card__reason">{entry.reason}</p>
                <div className="stop-card__footer">
                  <span className="stop-card__countdown">{formatCountdown(msLeft)}</span>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => onReturn(entry.id)}
                    disabled={returningId === entry.id}
                  >
                    {returningId === entry.id ? 'Возврат…' : 'Вернуть в продажу'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
