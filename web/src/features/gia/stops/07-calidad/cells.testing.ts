/** Reads table cells in tests. Never imported by runtime code. */
import type { Cell } from '../../model/types';

/** The text of a plain cell (string or number); other variants have no plain text. */
export function textOf(cell: Cell | undefined): string {
  if (typeof cell === 'string') return cell;
  if (typeof cell === 'number') return String(cell);
  return '';
}

/** The status of a chip cell, if the cell is one. */
export function statusOfCell(cell: Cell | undefined): string | undefined {
  return typeof cell === 'object' && 'status' in cell ? cell.status : undefined;
}

/** The text written next to the status of a chip cell, if the cell has one. */
export function chipTextOf(cell: Cell | undefined): string {
  return typeof cell === 'object' && 'status' in cell ? (cell.text ?? '') : '';
}
