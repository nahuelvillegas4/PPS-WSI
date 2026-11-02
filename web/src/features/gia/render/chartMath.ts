/** Arithmetic behind the waffle, the stacked bars and the quadrants. Totals are always computed. */
import { countBy, type Decision, type Status } from '../model/status';
import type { Block } from '../model/types';
import { STATUS_ORDER } from './statusOrder';

export type StatusCounts = Record<Status, number>;

/** Counts of each status, with zero for the ones that do not occur. */
export function countStatuses(statuses: readonly Status[]): StatusCounts {
  const counted = countBy(statuses, (status) => status);
  return {
    done: counted['done'] ?? 0,
    partial: counted['partial'] ?? 0,
    planned: counted['planned'] ?? 0,
    unknown: counted['unknown'] ?? 0,
  };
}

const COUNT_NOUNS: Readonly<Record<Status, readonly [string, string]>> = {
  done: ['implementado', 'implementados'],
  partial: ['parcial', 'parciales'],
  planned: ['planificado', 'planificados'],
  unknown: ['sin decidir', 'sin decidir'],
};

/** "17 implementados, 19 parciales, 1 planificado"; statuses with no items are left out. */
export function summarizeCounts(counts: StatusCounts): string {
  return STATUS_ORDER.filter((status) => counts[status] > 0)
    .map((status) => {
      const n = counts[status];
      const [singular, plural] = COUNT_NOUNS[status];
      return `${String(n)} ${n === 1 ? singular : plural}`;
    })
    .join(', ');
}

export interface BarSegment {
  status: Status;
  value: number;
  /** Share of the row total, rounded to a whole percent (for the label; the width uses `value`). */
  percent: number;
}

export function barTotal(segments: readonly { value: number }[]): number {
  return segments.reduce((sum, segment) => sum + Math.max(segment.value, 0), 0);
}

/** The visible segments of a bar: positive values only, in the order given. */
export function barSegments(segments: readonly { status: Status; value: number }[]): BarSegment[] {
  const total = barTotal(segments);
  if (total === 0) return [];
  return segments
    .filter((segment) => segment.value > 0)
    .map((segment) => ({
      status: segment.status,
      value: segment.value,
      percent: Math.round((segment.value / total) * 100),
    }));
}

type QuadrantCell = Extract<Block, { kind: 'quadrants' }>['cells'][number];
export type Realised = QuadrantCell['realised'];

export interface QuadrantSlot {
  items: readonly string[];
  count: number;
}

export interface QuadrantGrid {
  columns: readonly Decision[];
  rows: readonly Realised[];
  /** `slots[row][column]`, aligned with `rows` and `columns`. */
  slots: readonly (readonly QuadrantSlot[])[];
}

const QUADRANT_ROWS: readonly Realised[] = ['realizado', 'parcial'];

/**
 * Decision against realisation. DECIDIDO and PROPUESTO columns always exist (an empty square is
 * information); PENDIENTE appears only when some item has it. Cells repeating a square are merged.
 */
export function buildQuadrantGrid(cells: readonly QuadrantCell[]): QuadrantGrid {
  const columns: Decision[] = ['DECIDIDO', 'PROPUESTO'];
  if (cells.some((cell) => cell.decision === 'PENDIENTE')) columns.push('PENDIENTE');
  const slots = QUADRANT_ROWS.map((realised) =>
    columns.map((decision) => {
      const items = cells
        .filter((cell) => cell.realised === realised && cell.decision === decision)
        .flatMap((cell) => cell.items);
      return { items, count: items.length };
    }),
  );
  return { columns, rows: QUADRANT_ROWS, slots };
}
