import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, createStopEntry, fetchActiveStopList, fetchDishes, returnStopEntry } from './api';
import { ActiveStopList } from './components/ActiveStopList';
import { DishList } from './components/DishList';
import { StopDishForm } from './components/StopDishForm';
import type { CreateStopEntryInput, Dish, DishCategory, StopListEntryView } from './types';

const POLL_INTERVAL_MS = 10_000;

const App = () => {
  const [now, setNow] = useState(() => new Date());
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [dishesError, setDishesError] = useState<Error | null>(null);
  const [dishesLoading, setDishesLoading] = useState(true);

  const [active, setActive] = useState<StopListEntryView[]>([]);
  const [activeError, setActiveError] = useState<Error | null>(null);
  const [activeLoading, setActiveLoading] = useState(true);

  const [category, setCategory] = useState<DishCategory | ''>('');
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [returningId, setReturningId] = useState<string | null>(null);

  const loadDishes = useCallback(() => {
    setDishesLoading(true);
    setDishesError(null);
    fetchDishes()
      .then(setDishes)
      .catch((err) => setDishesError(err instanceof Error ? err : new Error('Не удалось загрузить блюда')))
      .finally(() => setDishesLoading(false));
  }, []);

  const loadActive = useCallback((silent = false) => {
    if (!silent) setActiveLoading(true);
    setActiveError(null);
    fetchActiveStopList()
      .then(setActive)
      .catch((err) => setActiveError(err instanceof Error ? err : new Error('Не удалось загрузить стоп-лист')))
      .finally(() => {
        if (!silent) setActiveLoading(false);
      });
  }, []);

  useEffect(loadDishes, [loadDishes]);
  useEffect(() => loadActive(), [loadActive]);

  useEffect(() => {
    const clockId = setInterval(() => setNow(new Date()), 1000);
    const pollId = setInterval(() => loadActive(true), POLL_INTERVAL_MS);
    return () => {
      clearInterval(clockId);
      clearInterval(pollId);
    };
  }, [loadActive]);

  const stoppedDishIds = useMemo(() => new Set(active.map((e) => e.dishId)), [active]);
  const visibleActive = useMemo(
    () => (category ? active.filter((e) => e.dish.category === category) : active),
    [active, category],
  );

  const handleStopSubmit = async (input: CreateStopEntryInput) => {
    setIsSubmitting(true);
    try {
      await createStopEntry(input);
      setSelectedDishId(null);
      loadActive();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturn = async (id: string) => {
    setReturningId(id);
    try {
      await returnStopEntry(id);
      loadActive();
    } catch (err) {
      if (err instanceof ApiError) console.error(err.message);
    } finally {
      setReturningId(null);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Стоп-лист кухни</h1>
        <p>Управляйте блюдами, временно снятыми с продажи.</p>
      </header>

      <div className="app-layout">
        <div>
          <section className="panel">
            <h2 className="section-title">Справочник блюд</h2>
            {dishesLoading && <p className="muted">Загрузка справочника блюд…</p>}
            {dishesError && (
              <div className="error-state">
                <p>Не удалось загрузить блюда: {dishesError.message}</p>
                <button type="button" className="btn btn-outline" onClick={loadDishes}>
                  Повторить
                </button>
              </div>
            )}
            {!dishesLoading && !dishesError && (
              <DishList dishes={dishes} stoppedDishIds={stoppedDishIds} onSelectDish={(d) => setSelectedDishId(d.id)} />
            )}
          </section>

          <section className="panel">
            <StopDishForm
              dishes={dishes}
              stoppedDishIds={stoppedDishIds}
              selectedDishId={selectedDishId}
              onDishChange={setSelectedDishId}
              onSubmit={handleStopSubmit}
              isSubmitting={isSubmitting}
            />
          </section>
        </div>

        <section className="panel">
          {activeLoading && <p className="muted">Загрузка стоп-листа…</p>}
          {activeError && (
            <div className="error-state">
              <p>Не удалось загрузить стоп-лист: {activeError.message}</p>
              <button type="button" className="btn btn-outline" onClick={() => loadActive()}>
                Повторить
              </button>
            </div>
          )}
          {!activeLoading && !activeError && (
            <ActiveStopList
              entries={visibleActive}
              now={now}
              category={category}
              onCategoryChange={setCategory}
              onReturn={handleReturn}
              returningId={returningId}
            />
          )}
        </section>
      </div>
    </div>
  );
};

export default App;
