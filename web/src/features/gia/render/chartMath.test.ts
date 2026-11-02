import { describe, expect, it } from 'vitest';
import { STATUS_META, type Status } from '../model/status';
import {
  barSegments,
  barTotal,
  buildQuadrantGrid,
  countStatuses,
  summarizeCounts,
} from './chartMath';
import { STATUS_ORDER } from './statusOrder';

describe('STATUS_ORDER', () => {
  it('lists every status exactly once', () => {
    expect([...STATUS_ORDER].sort()).toEqual(Object.keys(STATUS_META).sort());
  });
});

describe('countStatuses', () => {
  it('counts each status and reports zero for the absent ones', () => {
    const statuses: Status[] = ['done', 'done', 'partial', 'planned', 'done'];
    expect(countStatuses(statuses)).toEqual({ done: 3, partial: 1, planned: 1, unknown: 0 });
  });

  it('is all zeros for no statuses', () => {
    expect(countStatuses([])).toEqual({ done: 0, partial: 0, planned: 0, unknown: 0 });
  });
});

describe('summarizeCounts', () => {
  it('writes the counts in display order with Spanish plurals', () => {
    expect(summarizeCounts({ done: 17, partial: 19, planned: 1, unknown: 2 })).toBe(
      '17 implementados, 19 parciales, 1 planificado, 2 sin decidir',
    );
  });

  it('leaves out statuses with no items', () => {
    expect(summarizeCounts({ done: 1, partial: 0, planned: 5, unknown: 0 })).toBe(
      '1 implementado, 5 planificados',
    );
  });

  it('is empty when there is nothing to count', () => {
    expect(summarizeCounts({ done: 0, partial: 0, planned: 0, unknown: 0 })).toBe('');
  });
});

describe('barSegments', () => {
  it('computes whole-percent shares of the row total, in the order given', () => {
    expect(
      barSegments([
        { status: 'done', value: 17 },
        { status: 'partial', value: 19 },
        { status: 'planned', value: 3 },
      ]),
    ).toEqual([
      { status: 'done', value: 17, percent: 44 },
      { status: 'partial', value: 19, percent: 49 },
      { status: 'planned', value: 3, percent: 8 },
    ]);
  });

  it('drops zero and negative values from the visible segments', () => {
    const result = barSegments([
      { status: 'done', value: 5 },
      { status: 'partial', value: 0 },
      { status: 'planned', value: -2 },
    ]);
    expect(result).toEqual([{ status: 'done', value: 5, percent: 100 }]);
  });

  it('is empty when the total is zero', () => {
    expect(barSegments([{ status: 'done', value: 0 }])).toEqual([]);
    expect(barSegments([])).toEqual([]);
  });
});

describe('barTotal', () => {
  it('adds the positive values', () => {
    expect(barTotal([{ value: 17 }, { value: 19 }, { value: 1 }, { value: 2 }])).toBe(39);
    expect(barTotal([{ value: 4 }, { value: -3 }])).toBe(4);
  });
});

describe('buildQuadrantGrid', () => {
  const cells = [
    { decision: 'DECIDIDO' as const, realised: 'realizado' as const, items: ['ADR-01', 'ADR-02'] },
    { decision: 'DECIDIDO' as const, realised: 'parcial' as const, items: ['ADR-03'] },
    { decision: 'PROPUESTO' as const, realised: 'parcial' as const, items: ['ADR-15', 'ADR-16'] },
  ];

  it('always has the decided and proposed columns and the realised and partial rows', () => {
    const grid = buildQuadrantGrid([]);
    expect(grid.columns).toEqual(['DECIDIDO', 'PROPUESTO']);
    expect(grid.rows).toEqual(['realizado', 'parcial']);
    expect(grid.slots.flat().every((slot) => slot.count === 0)).toBe(true);
  });

  it('places the items by row (realisation) and column (decision)', () => {
    const grid = buildQuadrantGrid(cells);
    expect(grid.slots[0]?.[0]).toEqual({ items: ['ADR-01', 'ADR-02'], count: 2 });
    expect(grid.slots[1]?.[0]).toEqual({ items: ['ADR-03'], count: 1 });
    expect(grid.slots[0]?.[1]).toEqual({ items: [], count: 0 });
    expect(grid.slots[1]?.[1]).toEqual({ items: ['ADR-15', 'ADR-16'], count: 2 });
  });

  it('merges cells that repeat a square', () => {
    const grid = buildQuadrantGrid([
      ...cells,
      { decision: 'DECIDIDO', realised: 'realizado', items: ['ADR-04'] },
    ]);
    expect(grid.slots[0]?.[0]).toEqual({ items: ['ADR-01', 'ADR-02', 'ADR-04'], count: 3 });
  });

  it('adds a pending column only when some item is pending', () => {
    expect(buildQuadrantGrid(cells).columns).toHaveLength(2);
    const withPending = buildQuadrantGrid([
      ...cells,
      { decision: 'PENDIENTE', realised: 'parcial', items: ['ADR-99'] },
    ]);
    expect(withPending.columns).toEqual(['DECIDIDO', 'PROPUESTO', 'PENDIENTE']);
    expect(withPending.slots[1]?.[2]).toEqual({ items: ['ADR-99'], count: 1 });
  });

  it('keeps the total number of items', () => {
    const grid = buildQuadrantGrid(cells);
    expect(grid.slots.flat().reduce((sum, slot) => sum + slot.count, 0)).toBe(5);
  });
});
