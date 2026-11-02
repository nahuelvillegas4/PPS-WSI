import { STATUS_META } from '../model/status';
import type { Block } from '../model/types';
import { type BarSegment, barSegments, barTotal } from './chartMath';

type BarsBlock = Extract<Block, { kind: 'bars' }>;

function describeSegment(segment: BarSegment): string {
  return `${STATUS_META[segment.status].label}: ${String(segment.value)} (${String(segment.percent)} %)`;
}

/** Stacked horizontal bars: segment widths follow the numbers, labels show value and share. */
export function Bars({ rows }: { rows: BarsBlock['rows'] }) {
  return (
    <div className="gia-bars">
      {rows.map((row) => {
        const segments = barSegments(row.segments);
        const total = barTotal(row.segments);
        return (
          <div key={row.label} className="gia-bar-row">
            <p className="gia-bar-label">
              <strong>{row.label}</strong>
              <span className="gia-bar-total">{`${String(total)} en total`}</span>
            </p>
            <div
              className="gia-bar-track"
              role="img"
              aria-label={`${row.label}. ${segments.map(describeSegment).join(', ')}`}
            >
              {segments.map((segment) => (
                <span
                  key={segment.status}
                  className={`gia-bar-segment gia-st--${segment.status}`}
                  style={{ flexGrow: segment.value }}
                  title={describeSegment(segment)}
                  aria-hidden="true"
                >
                  {STATUS_META[segment.status].glyph} {segment.value}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
