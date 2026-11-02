import { STATUS_META } from '../model/status';
import type { Block } from '../model/types';
import { ChartLegend } from './ChartLegend';
import { chartLegend, countStatuses, summarizeCounts } from './chartMath';

type WaffleBlock = Extract<Block, { kind: 'waffle' }>;

interface WaffleProps {
  groups: WaffleBlock['groups'];
  statusLabels?: WaffleBlock['statusLabels'];
}

/** One square per item, grouped; the square carries the status glyph and the item as tooltip. */
export function Waffle({ groups, statusLabels }: WaffleProps) {
  const present = groups.flatMap((group) => group.cells.map((cell) => cell.status));
  return (
    <div className="gia-waffle">
      {groups.map((group) => {
        const summary = summarizeCounts(
          countStatuses(group.cells.map((cell) => cell.status)),
          statusLabels,
        );
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
      <ChartLegend entries={chartLegend(present, statusLabels)} />
    </div>
  );
}
