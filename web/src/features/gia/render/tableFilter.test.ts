import { describe, expect, it } from 'vitest';
import type { Status } from '../model/status';
import type { Cell, ColumnDef } from '../model/types';
import {
  EMPTY_FILTER,
  type TableFilter,
  filterRows,
  isFilterActive,
  isFilterable,
  normalizeSearch,
  statusCounts,
  toggleStatus,
} from './tableFilter';

const COLUMNS: ColumnDef[] = [
  { key: 'id', label: 'ID' },
  { key: 'text', label: 'Requisito' },
  { key: 'state', label: 'Estado', filterable: true },
];

const row = (id: string, text: string, state: Cell): Record<string, Cell> => ({ id, text, state });

const TABLE = {
  columns: COLUMNS,
  rows: [
    row('R1', 'Importar anotaciones del catálogo', { status: 'done' }),
    row('R2', 'Exportar a COCO', { status: 'partial' }),
    row('R3', 'Editor en el navegador', { status: 'planned' }),
    row('R4', 'Catálogo de imágenes', { status: 'done' }),
  ],
};

const only = (...statuses: Status[]): TableFilter => ({ text: '', statuses: new Set(statuses) });
const ids = (filter: TableFilter) => filterRows(TABLE, filter).map((r) => r.row['id']);

describe('normalizeSearch', () => {
  it('lowercases, strips accents and collapses spaces', () => {
    expect(normalizeSearch('  Catálogo   DE  Imágenes ')).toBe('catalogo de imagenes');
  });
});

describe('isFilterable', () => {
  it('is true when some column is marked filterable', () => {
    expect(isFilterable(TABLE)).toBe(true);
  });

  it('is false when none is', () => {
    expect(isFilterable({ columns: [{ key: 'a', label: 'A' }] })).toBe(false);
  });
});

describe('filterRows', () => {
  it('returns every row, with its original index, when the filter is empty', () => {
    const result = filterRows(TABLE, EMPTY_FILTER);
    expect(result.map((r) => r.index)).toEqual([0, 1, 2, 3]);
  });

  it('keeps the rows with a selected status', () => {
    expect(ids(only('done'))).toEqual(['R1', 'R4']);
  });

  it('accepts several statuses at once', () => {
    expect(ids(only('partial', 'planned'))).toEqual(['R2', 'R3']);
  });

  it('matches text without caring about case or accents', () => {
    expect(ids({ text: 'catalogo', statuses: new Set() })).toEqual(['R1', 'R4']);
  });

  it('requires every typed word to appear, in any column', () => {
    expect(ids({ text: 'catalogo imagenes', statuses: new Set() })).toEqual(['R4']);
    expect(ids({ text: 'r2 coco', statuses: new Set() })).toEqual(['R2']);
  });

  it('searches the visible text of status cells too', () => {
    expect(ids({ text: 'planificado', statuses: new Set() })).toEqual(['R3']);
  });

  it('combines the status and the text filters', () => {
    expect(ids({ text: 'catalogo', statuses: new Set<Status>(['partial']) })).toEqual([]);
    expect(ids({ text: 'catalogo', statuses: new Set<Status>(['done']) })).toEqual(['R1', 'R4']);
  });

  it('ignores the status of columns that are not filterable', () => {
    const table = {
      columns: [
        { key: 'a', label: 'A' },
        { key: 'b', label: 'B', filterable: true },
      ],
      rows: [{ a: { status: 'done' as const }, b: 'sin estado' }],
    };
    expect(filterRows(table, only('done'))).toEqual([]);
  });

  it('survives rows that lack a column', () => {
    const table = { columns: COLUMNS, rows: [{ id: 'R9' }] };
    expect(filterRows(table, { text: 'r9', statuses: new Set() })).toHaveLength(1);
    expect(filterRows(table, only('done'))).toEqual([]);
  });
});

describe('statusCounts', () => {
  it('counts rows per status in display order and leaves out absent statuses', () => {
    expect(statusCounts(TABLE)).toEqual([
      { status: 'done', count: 2 },
      { status: 'partial', count: 1 },
      { status: 'planned', count: 1 },
    ]);
  });

  it('counts a row once per status even if a cell repeats it', () => {
    const table = {
      columns: COLUMNS,
      rows: [
        row('R1', 'x', {
          chips: [
            { label: 'API', status: 'done' },
            { label: 'Web', status: 'done' },
          ],
        }),
      ],
    };
    expect(statusCounts(table)).toEqual([{ status: 'done', count: 1 }]);
  });
});

describe('toggleStatus', () => {
  it('adds a status that was not selected', () => {
    expect([...toggleStatus(new Set<Status>(['done']), 'partial')]).toEqual(['done', 'partial']);
  });

  it('removes a status that was selected', () => {
    expect([...toggleStatus(new Set<Status>(['done', 'partial']), 'done')]).toEqual(['partial']);
  });

  it('does not change the set it receives', () => {
    const current = new Set<Status>(['done']);
    toggleStatus(current, 'planned');
    expect([...current]).toEqual(['done']);
  });
});

describe('isFilterActive', () => {
  it('is false for the empty filter and for blank text', () => {
    expect(isFilterActive(EMPTY_FILTER)).toBe(false);
    expect(isFilterActive({ text: '   ', statuses: new Set() })).toBe(false);
  });

  it('is true with text or with a status', () => {
    expect(isFilterActive({ text: 'a', statuses: new Set() })).toBe(true);
    expect(isFilterActive(only('done'))).toBe(true);
  });
});
