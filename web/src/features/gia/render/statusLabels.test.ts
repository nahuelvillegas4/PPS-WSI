import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { StatusLabels } from '../model/types';
import { Bars } from './Bars';
import { Waffle } from './Waffle';

const PENDING: StatusLabels = { planned: { singular: 'pendiente', plural: 'pendientes' } };

const GROUPS = [
  {
    label: 'PPS 1',
    cells: [
      { status: 'done' as const, title: 'A' },
      { status: 'partial' as const, title: 'B' },
      { status: 'planned' as const, title: 'C' },
      { status: 'planned' as const, title: 'D' },
    ],
  },
  { label: 'PPS 2', cells: [{ status: 'planned' as const, title: 'E' }] },
];

const ROWS = [
  {
    label: 'Ambas PPS',
    segments: [
      { status: 'done' as const, value: 7 },
      { status: 'planned' as const, value: 3 },
    ],
  },
];

describe('Waffle', () => {
  it('names the statuses with the default nouns and shows no extra legend', () => {
    const html = renderToStaticMarkup(createElement(Waffle, { groups: GROUPS }));
    expect(html).toContain('1 implementado, 1 parcial, 2 planificados');
    expect(html).toContain('1 planificado');
    expect(html).not.toContain('pendiente');
    expect(html).not.toContain('gia-chart-legend');
  });

  it('uses the override in the captions, the accessible name and the legend', () => {
    const html = renderToStaticMarkup(
      createElement(Waffle, { groups: GROUPS, statusLabels: PENDING }),
    );
    expect(html).toContain('1 implementado, 1 parcial, 2 pendientes');
    expect(html).toContain('PPS 2: 1 pendiente');
    expect(html).not.toContain('planificado');
    expect(html).toContain('gia-chart-legend');
    expect(html).toContain('>Pendiente<');
    expect(html).toContain('>Implementado<');
  });
});

describe('Bars', () => {
  it('names the segments with the default label and shows no extra legend', () => {
    const html = renderToStaticMarkup(createElement(Bars, { rows: ROWS }));
    expect(html).toContain('Planificado: 3 (30 %)');
    expect(html).toContain('Implementado: 7 (70 %)');
    expect(html).not.toContain('gia-chart-legend');
  });

  it('uses the override in the segment titles, the accessible name and the legend', () => {
    const html = renderToStaticMarkup(createElement(Bars, { rows: ROWS, statusLabels: PENDING }));
    expect(html).toContain('title="Pendiente: 3 (30 %)"');
    expect(html).toContain('Ambas PPS. Implementado: 7 (70 %), Pendiente: 3 (30 %)');
    expect(html).not.toContain('Planificado');
    expect(html).toContain('gia-chart-legend');
  });
});
