/** Filtering of table rows by status chips and a text box. Pure; the component only holds state. */
import type { Status } from '../model/status';
import type { Cell, ColumnDef } from '../model/types';
import { STATUS_ORDER } from './statusOrder';
import { cellStatuses, cellText } from './tableFormat';

export interface TableFilter {
  text: string;
  /** Empty means "every status". */
  statuses: ReadonlySet<Status>;
}

export const EMPTY_FILTER: TableFilter = { text: '', statuses: new Set<Status>() };

interface FilterableTable {
  columns: readonly ColumnDef[];
  rows: readonly Record<string, Cell>[];
}

export interface IndexedRow {
  row: Record<string, Cell>;
  /** Position in the table before filtering; stable key of the row. */
  index: number;
}

/** Lowercase, without accents, single spaces: so "catalogo" finds "Catálogo". */
export function normalizeSearch(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** A table gets its filter bar when at least one column is marked `filterable`. */
export function isFilterable(table: Pick<FilterableTable, 'columns'>): boolean {
  return table.columns.some((column) => column.filterable === true);
}

function statusesOfRow(table: FilterableTable, row: Record<string, Cell>): Set<Status> {
  const found = new Set<Status>();
  for (const column of table.columns) {
    const cell = row[column.key];
    if (column.filterable !== true || cell === undefined) continue;
    for (const status of cellStatuses(cell)) found.add(status);
  }
  return found;
}

/** How many rows carry each status in the filterable columns; only statuses that occur appear. */
export function statusCounts(table: FilterableTable): { status: Status; count: number }[] {
  const counts = new Map<Status, number>();
  for (const row of table.rows) {
    for (const status of statusesOfRow(table, row)) {
      counts.set(status, (counts.get(status) ?? 0) + 1);
    }
  }
  return STATUS_ORDER.flatMap((status) => {
    const count = counts.get(status);
    return count === undefined ? [] : [{ status, count }];
  });
}

/** The set with `status` added, or removed when it was there. Never mutates its input. */
export function toggleStatus(current: ReadonlySet<Status>, status: Status): ReadonlySet<Status> {
  const next = new Set(current);
  if (next.has(status)) next.delete(status);
  else next.add(status);
  return next;
}

export function isFilterActive(filter: TableFilter): boolean {
  return filter.statuses.size > 0 || normalizeSearch(filter.text) !== '';
}

/**
 * Rows that pass the filter, in their original order. A row passes the status filter when one of
 * its filterable cells carries a selected status; it passes the text filter when every word
 * typed appears somewhere in its visible text.
 */
export function filterRows(table: FilterableTable, filter: TableFilter): IndexedRow[] {
  const words = normalizeSearch(filter.text)
    .split(' ')
    .filter((word) => word !== '');
  const result: IndexedRow[] = [];
  table.rows.forEach((row, index) => {
    if (filter.statuses.size > 0) {
      const own = statusesOfRow(table, row);
      if (![...filter.statuses].some((status) => own.has(status))) return;
    }
    if (words.length > 0) {
      const haystack = normalizeSearch(
        table.columns
          .map((column) => {
            const cell = row[column.key];
            return cell === undefined ? '' : cellText(cell);
          })
          .join(' '),
      );
      if (!words.every((word) => haystack.includes(word))) return;
    }
    result.push({ row, index });
  });
  return result;
}
