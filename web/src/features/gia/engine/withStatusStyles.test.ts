import { describe, expect, it } from 'vitest';
import type { DiagramDef } from '../model/types';
import { mixHex, TINT, type Palette } from './mermaidTheme';
import {
  buildClassDefs,
  statusStyles,
  styledSource,
  withStatusStyles,
  type DiagramKind,
} from './withStatusStyles';

// Two palettes that no hard-coded colour of the app could coincide with.
const PALETTE_A: Palette = {
  bg: '#112233',
  surface: '#445566',
  text: '#778899',
  muted: '#aabbcc',
  border: '#ddeeff',
  accent: '#13579b',
  warning: '#2468ac',
  dark: false,
};
const PALETTE_B: Palette = {
  bg: '#fe0001',
  surface: '#fd0102',
  text: '#fc0203',
  muted: '#fb0304',
  border: '#fa0405',
  accent: '#f90506',
  warning: '#f80607',
  dark: true,
};

const COLOUR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g;

function colours(text: string): string[] {
  return text.match(COLOUR_LITERAL) ?? [];
}

function allowedColours(palette: Palette): Set<string> {
  const base = [
    palette.bg,
    palette.surface,
    palette.text,
    palette.muted,
    palette.border,
    palette.accent,
    palette.warning,
  ];
  const allowed = new Set(base);
  for (const a of base) for (const b of base) allowed.add(mixHex(a, b, TINT));
  return allowed;
}

const KINDS: DiagramKind[] = ['flowchart', 'state', 'er', 'sequence', 'gantt'];

describe('buildClassDefs', () => {
  it('defines the four status classes for flowcharts and state diagrams', () => {
    for (const kind of ['flowchart', 'state'] as const) {
      const defs = buildClassDefs(PALETTE_A, kind);
      for (const name of ['done', 'partial', 'planned', 'unknown']) {
        expect(defs).toMatch(new RegExp(`^\\s*classDef ${name} `, 'm'));
      }
    }
  });

  it('draws done and partial solid and tinted, planned dashed and unknown dotted', () => {
    const styles = statusStyles(PALETTE_A);
    expect(styles.done).toEqual({
      fill: mixHex(PALETTE_A.surface, PALETTE_A.accent, TINT),
      stroke: PALETTE_A.accent,
    });
    expect(styles.partial.stroke).toBe(PALETTE_A.warning);
    expect(styles.planned).toMatchObject({ fill: PALETTE_A.surface, stroke: PALETTE_A.muted });
    expect(styles.planned.dash).toBeDefined();
    expect(styles.unknown.stroke).toBe(PALETTE_A.muted);
    expect(styles.unknown.dash).toBeDefined();
    expect(styles.unknown.dash).not.toBe(styles.planned.dash);

    const defs = buildClassDefs(PALETTE_A, 'flowchart');
    expect(defs).toMatch(/classDef done [^\n]*stroke-width:2px/);
    expect(defs).not.toMatch(/classDef done [^\n]*stroke-dasharray/);
    expect(defs).toMatch(/classDef planned [^\n]*stroke-dasharray:6 4/);
    expect(defs).toMatch(/classDef unknown [^\n]*stroke-dasharray:2 3/);
  });

  it('gives ER diagrams only the outline colour, without fill or dash', () => {
    const defs = buildClassDefs(PALETTE_A, 'er');
    expect(defs).toContain(`classDef done stroke:${PALETTE_A.accent}`);
    expect(defs).toContain(`classDef planned stroke:${PALETTE_A.muted}`);
    expect(defs).not.toMatch(/fill:|stroke-dasharray/);
  });

  it('adds nothing for sequence and gantt diagrams', () => {
    expect(buildClassDefs(PALETTE_A, 'sequence')).toBe('');
    expect(buildClassDefs(PALETTE_A, 'gantt')).toBe('');
  });
});

describe('withStatusStyles', () => {
  it('appends the block after the source and keeps the source intact', () => {
    const source = 'flowchart LR\n  A["● a"]:::done --> B["○ b"]:::planned\n\n';
    const out = withStatusStyles(source, PALETTE_A, 'flowchart');
    expect(out.startsWith('flowchart LR\n  A["● a"]:::done --> B["○ b"]:::planned\n')).toBe(true);
    expect(out).toContain('\n  classDef done ');
    expect(out.indexOf('classDef')).toBeGreaterThan(out.indexOf('B["○ b"]'));
  });

  it('returns sequence and gantt sources unchanged', () => {
    const sequence = 'sequenceDiagram\n  A->>B: hola';
    const gantt = 'gantt\n  dateFormat YYYY-MM-DD\n  T :2026-11-01, 1d';
    expect(withStatusStyles(sequence, PALETTE_A, 'sequence')).toBe(sequence);
    expect(withStatusStyles(gantt, PALETTE_A, 'gantt')).toBe(gantt);
  });

  it('writes no colour that is not derived from the palette it was given', () => {
    for (const palette of [PALETTE_A, PALETTE_B]) {
      const allowed = allowedColours(palette);
      for (const kind of KINDS) {
        for (const colour of colours(withStatusStyles('x', palette, kind))) {
          expect(allowed.has(colour), `${kind}: ${colour}`).toBe(true);
        }
      }
    }
  });

  it('does not repeat a colour between two palettes, so none is hard-coded', () => {
    for (const kind of KINDS) {
      const a = new Set(colours(withStatusStyles('x', PALETTE_A, kind)));
      const shared = colours(withStatusStyles('x', PALETTE_B, kind)).filter((colour) =>
        a.has(colour),
      );
      expect(shared, kind).toEqual([]);
    }
  });
});

describe('styledSource', () => {
  const base: DiagramDef = {
    id: 'demo',
    kind: 'flowchart',
    title: 'Demo',
    summary: 'Demo',
    source: 'flowchart LR\n  A["● a"]:::done',
    usesStatus: true,
    sources: [{ kind: 'doc', ref: 'docs/x.md' }],
    priority: 'P1',
  };

  it('applies the styles only when the diagram declares it uses the statuses', () => {
    expect(styledSource(base, PALETTE_A)).toContain('classDef done');
    expect(styledSource({ ...base, usesStatus: false }, PALETTE_A)).toBe(base.source);
  });
});
