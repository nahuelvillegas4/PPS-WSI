import { STATUS_META } from '../model/status';
import type { Block } from '../model/types';
import { countStatuses, summarizeCounts } from './chartMath';

type WaffleBlock = Extract<Block, { kind: 'waffle' }>;

/** One square per item, grouped; the square carries the status glyph and the item as tooltip. */
export function Waffle({ groups }: { groups: WaffleBlock['groups'] }) {
  return (
    <div className="gia-waffle">
      {groups.map((group) => {
        const summary = summarizeCounts(countStatuses(group.cells.map((cell) => cell.status)));
        return (
          <figure key={group.label} className="gia-waffle-group">
            <figcaption className="gia-waffle-caption">
              <strong>{group.label}</strong>
              <span className="gia-waffle-total">{`${String(group.cells.length)} en total`}</span>
            </figcaption>
            <div
              className="gia-waffle-grid"
              role="img"
              aria-label={`${group.label}: ${summary || 'sin elementos'}`}
            >
              {group.cells.map((cell, index) => (
                <span
                  key={index}
                  className={`gia-waffle-cell gia-st--${cell.status}`}
                  title={cell.title}
                  aria-hidden="true"
                >
                  {STATUS_META[cell.status].glyph}
                </span>
              ))}
            </div>
            <p className="gia-waffle-summary">{summary}</p>
          </figure>
        );
      })}
    </div>
  );
}
