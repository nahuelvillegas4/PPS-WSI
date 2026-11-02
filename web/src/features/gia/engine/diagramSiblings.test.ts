import { describe, expect, it } from 'vitest';
import type { Block, Section } from '../model/types';
import { diagramIdsOf, neighbour, siblingDiagramIds } from './diagramSiblings';

function section(id: string, tabs: Block[][], detail?: Block[]): Section {
  return {
    id,
    group: 'recorrido',
    title: id,
    headline: id,
    tabs: tabs.map((blocks, index) => ({
      id: `t${String(index)}`,
      label: `T${String(index)}`,
      blocks,
    })),
    notes: ['a', 'b'],
    detail,
  };
}

const d = (id: string): Block => ({ kind: 'diagram', id });

const FLUJOS = section(
  'flujos',
  [[d('tesela'), { kind: 'table', id: 'x' }], [d('login')], [d('tesela'), d('subida')]],
  [d('sesion')],
);
const DATOS = section('datos', [[d('er-implementado')]]);
const SECTIONS = [FLUJOS, DATOS];

describe('diagramIdsOf', () => {
  it('lists the diagrams of every tab in order, then the detail, without repeats', () => {
    expect(diagramIdsOf(FLUJOS)).toEqual(['tesela', 'login', 'subida', 'sesion']);
  });
});

describe('siblingDiagramIds', () => {
  it('returns the diagrams of the stop that shows the id', () => {
    expect(siblingDiagramIds(SECTIONS, 'subida')).toEqual(['tesela', 'login', 'subida', 'sesion']);
    expect(siblingDiagramIds(SECTIONS, 'er-implementado')).toEqual(['er-implementado']);
  });

  it('gives a diagram no section shows only itself', () => {
    expect(siblingDiagramIds(SECTIONS, 'huerfano')).toEqual(['huerfano']);
  });
});

describe('neighbour', () => {
  const ids = ['a', 'b', 'c'];

  it('moves one place and wraps around both ends', () => {
    expect(neighbour(ids, 'a', 1)).toBe('b');
    expect(neighbour(ids, 'c', 1)).toBe('a');
    expect(neighbour(ids, 'a', -1)).toBe('c');
  });

  it('stays put when the current id is not in the list', () => {
    expect(neighbour(ids, 'z', 1)).toBe('z');
    expect(neighbour([], 'a', 1)).toBe('a');
  });
});
