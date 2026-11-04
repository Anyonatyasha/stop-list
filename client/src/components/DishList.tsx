import type { Dish } from '../types';

interface Props {
  dishes: Dish[];
  stoppedDishIds: Set<string>;
  onSelectDish: (dish: Dish) => void;
}

export const DishList = ({ dishes, stoppedDishIds, onSelectDish }: Props) => {
  return (
    <ul className="dish-list">
      {dishes.map((dish) => {
        const stopped = stoppedDishIds.has(dish.id);
        return (
          <li key={dish.id} className="dish-row">
            <div className="dish-row__info">
              <span className="dish-row__name">{dish.name}</span>
              <span className="dish-row__meta">
                {dish.category} · {dish.price} ₽
              </span>
            </div>
            {stopped ? (
              <span className="badge">В стопе</span>
            ) : (
              <button type="button" className="btn btn-outline" onClick={() => onSelectDish(dish)}>
                В стоп
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
};
