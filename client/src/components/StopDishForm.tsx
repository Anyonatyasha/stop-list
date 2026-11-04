import { useState, type FormEvent } from 'react';
import { ApiError } from '../api';
import type { CreateStopEntryInput, Dish } from '../types';

interface Props {
  dishes: Dish[];
  stoppedDishIds: Set<string>;
  selectedDishId: string | null;
  onDishChange: (id: string) => void;
  onSubmit: (input: CreateStopEntryInput) => Promise<void>;
  isSubmitting: boolean;
}

interface Errors {
  dishId?: string;
  reason?: string;
  durationMinutes?: string;
}

const validate = (dishId: string, reason: string, duration: string): Errors => {
  const trimmedReason = reason.trim();
  const isDurationNumeric = /^\d+$/.test(duration.trim());
  const durationValue = Number(duration);

  const checks: [keyof Errors, string | undefined][] = [
    ['dishId', dishId ? undefined : 'Выберите блюдо'],
    [
      'reason',
      trimmedReason.length >= 5 && trimmedReason.length <= 200
        ? undefined
        : 'Причина должна содержать от 5 до 200 символов',
    ],
    [
      'durationMinutes',
      !isDurationNumeric
        ? 'Срок должен быть целым числом минут'
        : durationValue < 15 || durationValue > 720
          ? 'Срок должен быть от 15 до 720 минут'
          : undefined,
    ],
  ];

  return Object.fromEntries(checks.filter(([, message]) => message !== undefined)) as Errors;
};

export const StopDishForm = ({ dishes, stoppedDishIds, selectedDishId, onDishChange, onSubmit, isSubmitting }: Props) => {
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('60');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const available = dishes.filter((d) => !stoppedDishIds.has(d.id));
  const errors = validate(selectedDishId ?? '', reason, duration);
  const show = (field: keyof Errors) => (touched[field] || submitted) && errors[field];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTouched({ dishId: true, reason: true, durationMinutes: true });
    if (Object.keys(errors).length > 0) return;

    try {
      await onSubmit({ dishId: selectedDishId as string, reason: reason.trim(), durationMinutes: Number(duration) });
      setReason('');
      setDuration('60');
      setSubmitted(false);
      setTouched({});
      setFormError(null);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Не удалось поставить блюдо в стоп');
    }
  };

  return (
    <form className="stop-form" onSubmit={handleSubmit} noValidate>
      <h2 className="section-title">Поставить блюдо в стоп</h2>

      <div className="form-field">
        <label htmlFor="dishId">Блюдо</label>
        <select
          id="dishId"
          value={selectedDishId ?? ''}
          onChange={(e) => onDishChange(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, dishId: true }))}
          className={show('dishId') ? 'input input--error' : 'input'}
          disabled={isSubmitting}
        >
          <option value="">Выберите блюдо…</option>
          {available.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.category})
            </option>
          ))}
        </select>
        {show('dishId') && <p className="field-error">{errors.dishId}</p>}
      </div>

      <div className="form-field">
        <label htmlFor="reason">Причина</label>
        <textarea
          id="reason"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, reason: true }))}
          className={show('reason') ? 'input input--error' : 'input'}
          placeholder="Например: закончился продукт"
          disabled={isSubmitting}
        />
        {show('reason') && <p className="field-error">{errors.reason}</p>}
      </div>

      <div className="form-field">
        <label htmlFor="duration">Срок (минут)</label>
        <input
          id="duration"
          type="number"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, durationMinutes: true }))}
          className={show('durationMinutes') ? 'input input--error' : 'input'}
          disabled={isSubmitting}
        />
        {show('durationMinutes') && <p className="field-error">{errors.durationMinutes}</p>}
      </div>

      {formError && <p className="form-error">{formError}</p>}

      <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
        {isSubmitting ? 'Сохранение…' : 'Поставить в стоп'}
      </button>
    </form>
  );
};
