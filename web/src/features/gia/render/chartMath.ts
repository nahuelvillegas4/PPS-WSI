/** Arithmetic behind the waffle, the stacked bars and the quadrants. Totals are always computed. */
import { countBy, STATUS_META, type Decision, type Status } from '../model/status';
import type { Block, StatusLabels } from '../model/types';
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

/**
 * The noun for `count` items of a status: "1 implementado", "3 implementados". `labels` replaces
 * the default noun of the statuses it names (for example `planned` as "pendiente"/"pendientes").
 */
export function statusNoun(status: Status, count: number, labels?: StatusLabels): string {
  const override = labels?.[status];
  const [singular, plural] = override
    ? ([override.singular, override.plural] as const)
    : COUNT_NOUNS[status];
  return count === 1 ? singular : plural;
}

/** The name of a status in a legend: "Implementado", or the capitalised override ("Pendiente"). */
export function statusName(status: Status, labels?: StatusLabels): string {
  const singular = labels?.[status]?.singular;
  if (singular === undefined) return STATUS_META[status].label;
  return singular.charAt(0).toLocaleUpperCase('es') + singular.slice(1);
}

/** "17 implementados, 19 parciales, 1 planificado"; statuses with no items are left out. */
export function summarizeCounts(counts: StatusCounts, labels?: StatusLabels): string {
  return STATUS_ORDER.filter((status) => counts[status] > 0)
    .map((status) => `${String(counts[status])} ${statusNoun(status, counts[status], labels)}`)
    .join(', ');
}

export interface LegendEntry {
  status: Status;
  glyph: string;
  name: string;
}

/**
 * The legend of a chart that renames statuses: the glyph and the name of every status that
 * occurs in it, in display order. Empty when there is no override, because the page legend
 * already says what the default names are.
 */
export function chartLegend(statuses: readonly Status[], labels?: StatusLabels): LegendEntry[] {
  if (labels === undefined) return [];
  return STATUS_ORDER.filter((status) => statuses.includes(status)).map((status) => ({
    status,
    glyph: STATUS_META[status].glyph,
    name: statusName(status, labels),
  }));
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
