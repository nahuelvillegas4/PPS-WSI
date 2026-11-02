import { STATUS_META } from '../model/status';
import type { Block } from '../model/types';
import { ChartLegend } from './ChartLegend';
import { type BarSegment, barSegments, barTotal, chartLegend, statusName } from './chartMath';

type BarsBlock = Extract<Block, { kind: 'bars' }>;

interface BarsProps {
  rows: BarsBlock['rows'];
  statusLabels?: BarsBlock['statusLabels'];
}

function describeSegment(segment: BarSegment, labels: BarsBlock['statusLabels']): string {
  return `${statusName(segment.status, labels)}: ${String(segment.value)} (${String(segment.percent)} %)`;
}

/** Stacked horizontal bars: segment widths follow the numbers, labels show value and share. */
export function Bars({ rows, statusLabels }: BarsProps) {
  const present = rows.flatMap((row) => barSegments(row.segments).map((segment) => segment.status));
  return (
    <div className="gia-bars">
      {rows.map((row) => {
        const segments = barSegments(row.segments);
        const total = barTotal(row.segments);
        const described = segments.map((segment) => describeSegment(segment, statusLabels));
        return (
          <div key={row.label} className="gia-bar-row">
            <p className="gia-bar-label">
              <strong>{row.label}</strong>
              <span className="gia-bar-total">{`${String(total)} en total`}</span>
            </p>
            <div
              className="gia-bar-track"
              role="img"
              aria-label={`${row.label}. ${described.join(', ')}`}
            >
              {segments.map((segment, index) => (
                <span
                  key={segment.status}
                  className={`gia-bar-segment gia-st--${segment.status}`}
                  style={{ flexGrow: segment.value }}
                  title={described[index]}
                  aria-hidden="true"
                >
                  {STATUS_META[segment.status].glyph} {segment.value}
                </span>
              ))}
            </div>
          </div>
        );
      })}
      <ChartLegend entries={chartLegend(present, statusLabels)} />
    </div>
  );
}
