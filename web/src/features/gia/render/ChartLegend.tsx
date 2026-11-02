import type { LegendEntry } from './chartMath';

/**
 * What each glyph of a chart means when the chart renames a status. Renders nothing for an empty
 * list, so a chart with the default names shows no extra legend.
 */
export function ChartLegend({ entries }: { entries: readonly LegendEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <ul className="gia-legend-list gia-chart-legend" aria-label="Estados de este gráfico">
      {entries.map((entry) => (
        <li key={entry.status} className="gia-legend-item">
          <span className={`gia-swatch gia-st--${entry.status}`} aria-hidden="true">
            {entry.glyph}
          </span>
          <span className="gia-legend-label">{entry.name}</span>
        </li>
      ))}
    </ul>
  );
}
