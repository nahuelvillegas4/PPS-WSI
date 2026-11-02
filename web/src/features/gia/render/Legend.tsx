import { STATUS_META } from '../model/status';
import { STATUS_ORDER } from './statusOrder';

/** How each status is drawn. Colour is never the only signal: outline style and glyph repeat it. */
const HINTS = {
  done: 'borde continuo',
  partial: 'borde continuo, a medias',
  planned: 'borde de trazos',
  unknown: 'borde de puntos',
} as const;

export function Legend() {
  return (
    <div className="gia-legend" role="group" aria-label="Cómo leer el estado">
      <p className="gia-legend-title">Cómo leer el estado</p>
      <ul className="gia-legend-list">
        {STATUS_ORDER.map((status) => (
          <li key={status} className="gia-legend-item">
            <span className={`gia-swatch gia-st--${status}`} aria-hidden="true">
              {STATUS_META[status].glyph}
            </span>
            <span className="gia-legend-label">{STATUS_META[status].label}</span>
            <span className="gia-legend-hint">{HINTS[status]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
