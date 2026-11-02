import { describe, expect, it } from 'vitest';
import type { Cell } from '../model/types';
import { APPROVAL_LABELS, cellStatuses, cellText, formatNumber, yesLabel } from './tableFormat';

describe('formatNumber', () => {
  it.each([
    [0, '0'],
    [3, '3'],
    [292, '292'],
    [1234, '1234'],
    [12345, '12.345'],
    [1234567, '1.234.567'],
    [0.5, '0,5'],
    [12345.25, '12.345,25'],
    [-12345, '-12.345'],
    [-3, '-3'],
  ])('formats %s as %s', (value, expected) => {
    expect(formatNumber(value)).toBe(expected);
  });

  it('leaves values it cannot group as JavaScript prints them', () => {
    expect(formatNumber(Number.NaN)).toBe('NaN');
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe('Infinity');
    expect(formatNumber(1e21)).toBe('1e+21');
  });
});

describe('cellText', () => {
  it('returns strings and formatted numbers as they read', () => {
    expect(cellText('Catálogo')).toBe('Catálogo');
    expect(cellText(40)).toBe('40');
    expect(cellText(12345)).toBe('12.345');
  });

  it('uses the status label unless the cell brings its own text', () => {
    expect(cellText({ status: 'partial' })).toBe('Parcial');
    expect(cellText({ status: 'planned', text: 'Sin pantalla' })).toBe('Sin pantalla');
  });

  it('returns decision and approval as printed in the chips', () => {
    expect(cellText({ decision: 'PROPUESTO' })).toBe('PROPUESTO');
    expect(cellText({ approval: 'NO_REGISTRADA' })).toBe('NO REGISTRADA');
    expect(cellText({ approval: 'PENDIENTE' })).toBe('PENDIENTE');
  });

  it('joins the labels of a chip list and returns monospace text as is', () => {
    expect(
      cellText({
        chips: [
          { label: 'API', status: 'done' },
          { label: 'Web', status: 'partial' },
        ],
      }),
    ).toBe('API, Web');
    expect(cellText({ mono: 'GET /auth/me' })).toBe('GET /auth/me');
  });

  it('spells out the yes/no marks', () => {
    expect(cellText({ yes: true })).toBe('Sí');
    expect(cellText({ yes: false })).toBe('No');
    expect(cellText({ yes: 'partial' })).toBe('Parcial');
    expect(cellText({ yes: 'own' })).toBe('Solo el autor');
  });
});

describe('yesLabel and APPROVAL_LABELS', () => {
  it('has a label for every value', () => {
    expect([true, false, 'partial', 'own'].map((v) => yesLabel(v as boolean))).toEqual([
      'Sí',
      'No',
      'Parcial',
      'Solo el autor',
    ]);
    expect(Object.keys(APPROVAL_LABELS).sort()).toEqual([
      'NO_REGISTRADA',
      'PENDIENTE',
      'REGISTRADA',
    ]);
  });
});

describe('cellStatuses', () => {
  it('has no status for plain text, numbers, decisions, approvals, monospace and marks', () => {
    const cells: Cell[] = [
      'x',
      4,
      { decision: 'DECIDIDO' },
      { approval: 'PENDIENTE' },
      { mono: 'a' },
      { yes: true },
    ];
    for (const cell of cells) expect(cellStatuses(cell)).toEqual([]);
  });

  it('returns the status of a status cell', () => {
    expect(cellStatuses({ status: 'done' })).toEqual(['done']);
  });

  it('returns the status of every chip, in order', () => {
    expect(
      cellStatuses({
        chips: [
          { label: 'API', status: 'done' },
          { label: 'Web', status: 'planned' },
        ],
      }),
    ).toEqual(['done', 'planned']);
  });
});
