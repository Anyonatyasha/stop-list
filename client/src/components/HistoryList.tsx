import type { StopListEntryView } from '../types';

interface Props {
  items: StopListEntryView[];
  total: number;
  limit: number;
  offset: number;
  onPageChange: (newOffset: number) => void;
}

const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export const HistoryList = ({ items, total, limit, offset, onPageChange }: Props) => {
  if (items.length === 0) {
    return <p className="empty-state">История пока пуста</p>;
  }

  return (
    <div className="history-list">
      <table className="history-table">
        <thead>
          <tr>
            <th>Блюдо</th>
            <th>Категория</th>
            <th>Причина</th>
            <th>Поставлено</th>
            <th>Снято</th>
            <th>Статус</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.dish.name}</td>
              <td>{item.dish.category}</td>
              <td>{item.reason}</td>
              <td>{formatDateTime(item.stoppedAt)}</td>
              <td>{item.returnedAt ? formatDateTime(item.returnedAt) : formatDateTime(item.expiresAt)}</td>
              <td>{item.status === 'returned' ? 'Возвращено досрочно' : 'Истёк срок'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="history-pagination">
        <button
          type='button'
          className="btn btn-outline"
          onClick={() => onPageChange(Math.max(0, offset - limit))}
          disabled={offset === 0}
        >
          Назад
        </button>
        <span>
          {offset + 1}–{Math.min(offset + limit, total)} из {total}
        </span>
        <button
          type='button'
          className="btn btn-outline"
          onClick={() => onPageChange(offset + limit)}
          disabled={offset + limit >= total}
        >
          Вперёд
        </button>
      </div>
    </div>
  );
};
