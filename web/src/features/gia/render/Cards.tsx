import type { Block } from '../model/types';
import { StatusChip } from './StatusChip';

type CardsBlock = Extract<Block, { kind: 'cards' }>;

/** A responsive grid of titled cards with an optional status and tag list. */
export function Cards({ items }: { items: CardsBlock['items'] }) {
  return (
    <ul className="gia-cards">
      {items.map((item, index) => (
        <li key={index} className="gia-card">
          <h3 className="gia-card-title">{item.title}</h3>
          {item.status && <StatusChip status={item.status} />}
          <p className="gia-card-body">{item.body}</p>
          {item.chips && item.chips.length > 0 && (
            <ul className="gia-tags">
              {item.chips.map((chip) => (
                <li key={chip} className="gia-tag">
                  {chip}
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}
