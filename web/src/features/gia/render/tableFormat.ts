/** Plain-text view of table cells: for search, accessible names and the marks of yes/no cells. */
import { assertNever } from '../../../shared/assertNever';
import { type Approval, STATUS_META, type Status } from '../model/status';
import type { Cell } from '../model/types';

export const APPROVAL_LABELS: Readonly<Record<Approval, string>> = {
  NO_REGISTRADA: 'NO REGISTRADA',
  PENDIENTE: 'PENDIENTE',
  REGISTRADA: 'REGISTRADA',
};

export type YesValue = boolean | 'partial' | 'own';

/** Spoken and searchable meaning of a yes/no cell. */
export function yesLabel(value: YesValue): string {
  switch (value) {
    case true:
      return 'Sí';
    case false:
      return 'No';
    case 'partial':
      return 'Parcial';
    case 'own':
      return 'Solo el autor';
  }
}

/**
 * Spanish number format without a locale lookup (so it is the same everywhere): comma for
 * decimals, a dot every three digits from five digits up (four digits are written together).
 */
export function formatNumber(value: number): string {
  const plain = String(Math.abs(value));
  if (!Number.isFinite(value) || plain.includes('e')) return String(value);
  const [integer = '', fraction] = plain.split('.');
  const grouped = integer.length > 4 ? integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : integer;
  const sign = value < 0 ? '-' : '';
  return fraction === undefined ? `${sign}${grouped}` : `${sign}${grouped},${fraction}`;
}

/** The text a reader would see in the cell. */
export function cellText(cell: Cell): string {
  if (typeof cell === 'string') return cell;
  if (typeof cell === 'number') return formatNumber(cell);
  if ('status' in cell) return cell.text ?? STATUS_META[cell.status].label;
  if ('decision' in cell) return cell.decision;
  if ('approval' in cell) return APPROVAL_LABELS[cell.approval];
  if ('chips' in cell) return cell.chips.map((chip) => chip.label).join(', ');
  if ('mono' in cell) return cell.mono;
  if ('yes' in cell) return yesLabel(cell.yes);
  return assertNever(cell);
}

/** The statuses a cell carries (none for plain text), used by the status filter. */
export function cellStatuses(cell: Cell): readonly Status[] {
  if (typeof cell === 'string' || typeof cell === 'number') return [];
  if ('status' in cell) return [cell.status];
  if ('chips' in cell) return cell.chips.map((chip) => chip.status);
  return [];
}
