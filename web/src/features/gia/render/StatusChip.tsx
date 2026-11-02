import { STATUS_META, type Status } from '../model/status';

interface StatusChipProps {
  status: Status;
  /** Visible text; defaults to the status label ("Implementado", ...). */
  text?: string;
  /** Short prefix that names what the status is about ("API", "Web"). */
  prefix?: string;
  /** Show only the glyph and the prefix; the label stays in the accessible name. */
  compact?: boolean;
}

/** Status as fill + outline + glyph, so it still reads on a projector or in greyscale. */
export function StatusChip({ status, text, prefix, compact = false }: StatusChipProps) {
  const meta = STATUS_META[status];
  const label = text ?? meta.label;
  const tooltip = prefix ? `${prefix}: ${meta.label}` : meta.label;
  return (
    <span className={`gia-chip gia-st--${status}`} title={tooltip}>
      <span className="gia-chip-glyph" aria-hidden="true">
        {meta.glyph}
      </span>
      {prefix && <span className="gia-chip-prefix">{prefix}</span>}
      {compact ? (
        <span className="gia-sr">{label}</span>
      ) : (
        <span className="gia-chip-text">{label}</span>
      )}
    </span>
  );
}
