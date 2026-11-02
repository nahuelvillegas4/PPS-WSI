import { STATUS_META } from '../model/status';
import type { Block } from '../model/types';

type StatsBlock = Extract<Block, { kind: 'stats' }>;

/** Big numbers with a caption; the values come from `FACTS` or from counted rows. */
export function Stats({ items }: { items: StatsBlock['items'] }) {
  return (
    <ul className="gia-stats">
      {items.map((item) => (
        <li key={item.label} className={`gia-stat${item.status ? ` gia-st--${item.status}` : ''}`}>
          <strong className="gia-stat-value">{item.value}</strong>
          <span className="gia-stat-label">{item.label}</span>
          {item.status && (
            <span className="gia-stat-status">
              <span aria-hidden="true">{STATUS_META[item.status].glyph}</span>
              <span className="gia-sr">{STATUS_META[item.status].label}</span>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
