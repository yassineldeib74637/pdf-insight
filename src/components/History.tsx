import type { HistoryItem } from '../lib/history';

interface Props {
  items: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
}

export function History({ items, onSelect }: Props) {
  if (items.length === 0) return null;
  return (
    <section className="history" aria-labelledby="history-title">
      <h2 id="history-title">Ostatnie analizy</h2>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className="history__item"
              onClick={() => onSelect(item)}
            >
              <span>
                {item.analysis.document.title ?? item.analysis.document.fileName}
              </span>
              <span className="muted">
                {new Date(item.savedAt).toLocaleString('pl-PL', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
