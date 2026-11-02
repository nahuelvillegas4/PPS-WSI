import { describe, expect, it } from 'vitest';
import type { DiagramDef } from '../model/types';
import { DIAGRAMS } from '../model/registry';
import {
  codeLines,
  formatIssues,
  lintDiagram,
  scanFlowchart,
  scanParticipants,
  type LintRule,
} from './diagramLint';

function make(partial: Partial<DiagramDef> & Pick<DiagramDef, 'source'>): DiagramDef {
  return {
    id: 'demo',
    kind: 'flowchart',
    title: 'Demo',
    summary: 'A demo diagram.',
    usesStatus: false,
    sources: [{ kind: 'doc', ref: 'docs/arquitectura/03-bloques-y-ejecucion.md' }],
    priority: 'P1',
    ...partial,
  };
}

function rules(diagram: DiagramDef): LintRule[] {
  return lintDiagram(diagram).map((issue) => issue.rule);
}

const GOOD_FLOWCHART = make({
  usesStatus: true,
  source: [
    'flowchart LR',
    '  subgraph PPS1["PPS 1 · compartido"]',
    '    V["● Visor y teselas"]:::done',
    '    E["○ Editor<br/>en el navegador"]:::planned',
    '  end',
    '  V -->|"HTTP y contrato"| A["◐ API"]:::partial',
    '  E -.-> V',
  ].join('\n'),
});

describe('lintDiagram: passing sources', () => {
  it('accepts a status flowchart with subgraph, edge labels, <br/> and classes', () => {
    expect(formatIssues(GOOD_FLOWCHART)).toEqual([]);
  });

  it('accepts one source of every other kind', () => {
    const sequence = make({
      kind: 'sequence',
      source: [
        'sequenceDiagram',
        '  participant N as Navegador',
        '  participant P as Pasarela',
        '  participant A as API',
        '  N->>P: pedido de tesela',
        '  P->>A: consulta de acceso',
        '  alt sesión válida',
        '    A-->>P: 204',
        '  else sin sesión',
        '    A-->>P: 401',
        '  end',
        '  rect rgba(128, 128, 128, 0.18)',
        '    Note over N,P: PLANIFICADO',
        '  end',
      ].join('\n'),
    });
    const er = make({
      kind: 'er',
      usesStatus: true,
      source: [
        'erDiagram',
        '  users:::done {',
        '    uuid id PK "identificador"',
        '  }',
        '  review:::planned',
        '  users ||--o{ review : "revisa"',
      ].join('\n'),
    });
    const state = make({
      kind: 'state',
      usesStatus: true,
      source: [
        'stateDiagram-v2',
        '  [*] --> Propuesto',
        '  state "● En main" as EnMain',
        '  Propuesto --> EnMain',
        '  EnMain:::done',
        '  state "○ Aprobación escrita" as Aprobacion',
        '  EnMain --> Aprobacion : pendiente',
        '  class Aprobacion planned',
      ].join('\n'),
    });
    const gantt = make({
      kind: 'gantt',
      source: [
        'gantt',
        '  dateFormat YYYY-MM-DD',
        '  title Plan frente a lo hecho',
        '  todayMarker stroke-width:2px',
        '  section Plan',
        '  I0 :done, i0, 2026-10-19, 7d',
      ].join('\n'),
    });
    for (const diagram of [sequence, er, state, gantt]) {
      expect(formatIssues(diagram), diagram.kind).toEqual([]);
    }
  });

  it('allows state markers and comments', () => {
    const state = make({
      kind: 'state',
      source: 'stateDiagram-v2\n  %% a comment\n  state c <<choice>>\n  [*] --> c',
    });
    expect(formatIssues(state)).toEqual([]);
  });
});

describe('lintDiagram: metadata and structure', () => {
  it('requires a title, a summary, a source and evidence', () => {
    const empty = make({ source: 'flowchart LR\n  A["a"]', title: ' ', summary: '', sources: [] });
    expect(rules(empty)).toEqual(['metadata', 'metadata', 'metadata']);
    expect(rules(make({ source: '  ' }))).toEqual(['metadata']);
    expect(
      rules(make({ source: 'flowchart LR\n  A["a"]', sources: [{ kind: 'doc', ref: ' ' }] })),
    ).toEqual(['metadata']);
  });

  it('requires the lowercase catalogue slug, never a G-number', () => {
    const base = { source: 'flowchart LR\n  A["a"]' };
    expect(rules(make({ ...base, id: 'er-implementado' }))).toEqual([]);
    expect(rules(make({ ...base, id: 'G07' }))).toEqual(['id-format']);
    expect(rules(make({ ...base, id: 'g07' }))).toEqual(['id-format']);
    expect(rules(make({ ...base, id: 'Mi Diagrama' }))).toEqual(['id-format']);
  });

  it('starts with one of the five diagram keywords and matches the kind', () => {
    expect(rules(make({ source: 'graph LR\n  A["a"]' }))).toContain('first-keyword');
    expect(rules(make({ source: 'classDiagram\n  A' }))).toContain('first-keyword');
    expect(rules(make({ source: '---\ntitle: x\n---\nflowchart LR\n  A["a"]' }))).toContain(
      'first-keyword',
    );
    expect(rules(make({ kind: 'sequence', source: 'flowchart LR\n  A["a"]' }))).toEqual([
      'kind-mismatch',
    ]);
    expect(rules(make({ source: '%% intro\n\nflowchart TD\n  A["a"]' }))).toEqual([]);
  });
});

describe('lintDiagram: forbidden content', () => {
  const flow = (...body: string[]) => make({ source: ['flowchart LR', ...body].join('\n') });

  it.each([
    ['init directive', '%%{init: {"theme": "dark"}}%%'],
    ['click', '  click A callback'],
    ['script tag', '  A["<script>alert(1)</script>"]'],
    ['javascript url', '  A["javascript:alert(1)"]'],
    ['href', '  A["<span href=x>a</span>"]'],
    ['img tag', '  A["<img src=x>"]'],
    ['anchor tag', '  A["<a>x</a>"]'],
  ])('rejects %s', (_name, line) => {
    expect(rules(flow(line))).toContain('forbidden-token');
  });

  it('rejects HTML other than <br/>, and accepts every spelling of <br>', () => {
    expect(rules(flow('  A["<b>bold</b>"]'))).toContain('forbidden-html');
    expect(rules(flow('  A["uno<br/>dos<br>tres<br />cuatro"]'))).toEqual([]);
  });

  it('rejects the style directives the engine owns', () => {
    expect(rules(flow('  A["a"]', '  classDef done fill:#fff'))).toContain('forbidden-directive');
    expect(rules(flow('  A["a"]', '  style A fill:#fff'))).toContain('forbidden-directive');
    expect(rules(flow('  A["a"] --> B["b"]', '  linkStyle 0 stroke:red'))).toContain(
      'forbidden-directive',
    );
  });

  it('rejects colour literals anywhere but a neutral grey sequence rect', () => {
    expect(rules(flow('  A["a"]', '  X:::done', '  %%{x}'))).toContain('forbidden-token');
    expect(rules(flow('  A["fondo #ff0000"]'))).toContain('colour-literal');
    expect(rules(flow('  A["fondo rgb(1, 2, 3)"]'))).toContain('colour-literal');
    expect(rules(flow('  A["entidad &#35; ok"]'))).toEqual([]);
  });

  it('allows only a neutral grey for a sequence rect', () => {
    const seq = (rect: string) =>
      make({
        kind: 'sequence',
        source: `sequenceDiagram\n  participant A\n  participant B\n  ${rect}\n    A->>B: x\n  end`,
      });
    expect(rules(seq('rect rgba(128, 128, 128, 0.18)'))).toEqual([]);
    expect(rules(seq('rect rgb(200,200,200)'))).toEqual([]);
    expect(rules(seq('rect rgba(255, 0, 0, 0.2)'))).toEqual(['rect-colour']);
    expect(rules(seq('rect red'))).toEqual(['rect-colour']);
    expect(rules(seq('rect'))).toEqual(['rect-colour']);
  });
});

describe('lintDiagram: status classes and glyphs', () => {
  it('accepts only the four status class names', () => {
    const source = 'flowchart LR\n  A["● a"]:::hecho';
    expect(rules(make({ source, usesStatus: true }))).toContain('class-name');
    expect(
      rules(make({ source: 'flowchart LR\n  A["a"]\n  class A destacado', usesStatus: true })),
    ).toContain('class-name');
  });

  it('requires the glyph of the status at the start of the label', () => {
    const missing = make({ source: 'flowchart LR\n  A["Visor"]:::done', usesStatus: true });
    expect(lintDiagram(missing)).toEqual([
      expect.objectContaining({ rule: 'glyph-missing', line: 2 }),
    ]);
    const wrong = make({ source: 'flowchart LR\n  A["○ Visor"]:::done', usesStatus: true });
    expect(rules(wrong)).toEqual(['glyph-missing']);
    const unknown = make({ source: 'flowchart LR\n  A["? Servidor"]:::unknown', usesStatus: true });
    expect(rules(unknown)).toEqual([]);
  });

  it('checks every node of a line that defines several', () => {
    const source = 'flowchart LR\n  A["● a"]:::done --> B["b"]:::planned';
    expect(rules(make({ source, usesStatus: true }))).toEqual(['glyph-missing']);
  });

  it('finds the glyph of a bare reference in the line that defines the node', () => {
    const ok = make({
      kind: 'state',
      usesStatus: true,
      source: 'stateDiagram-v2\n  state "◐ Parcial" as P\n  [*] --> P\n  P:::partial',
    });
    expect(rules(ok)).toEqual([]);
    const bad = make({
      kind: 'state',
      usesStatus: true,
      source: 'stateDiagram-v2\n  state "Parcial" as P\n  [*] --> P\n  P:::partial',
    });
    expect(rules(bad)).toEqual(['glyph-missing']);
  });

  it('keeps usesStatus and the use of classes in agreement', () => {
    expect(rules(make({ source: 'flowchart LR\n  A["● a"]:::done', usesStatus: false }))).toEqual([
      'uses-status',
    ]);
    expect(rules(make({ source: 'flowchart LR\n  A["a"]', usesStatus: true }))).toEqual([
      'uses-status',
    ]);
    expect(
      rules(make({ kind: 'sequence', source: 'sequenceDiagram\n  A->>B: x', usesStatus: true })),
    ).toContain('uses-status');
  });
});

describe('lintDiagram: budgets', () => {
  function chain(count: number): string {
    const lines = ['flowchart LR'];
    for (let i = 1; i < count; i += 1)
      lines.push(`  N${String(i)}["n${String(i)}"] --> N${String(i + 1)}["n${String(i + 1)}"]`);
    return lines.join('\n');
  }

  it('allows 14 flowchart nodes and rejects 15', () => {
    expect(rules(make({ source: chain(14) }))).toEqual([]);
    expect(rules(make({ source: chain(15) }))).toEqual(['node-budget']);
  });

  it('counts a node once however many edges mention it, and ignores subgraphs', () => {
    const scan = scanFlowchart(
      codeLines(
        [
          'flowchart TB',
          '  subgraph G["Grupo"]',
          '    A["a"] --> B["b"]',
          '    A --> C["c"] & D["d"]',
          '  end',
          '  G --> E["e"]',
          '  B -.->|"x"| E',
          '  F["f"]:::done --- A',
        ].join('\n'),
      ),
    );
    expect([...scan.nodes].sort()).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
    expect(scan.unquoted).toEqual([]);
  });

  it('reads every edge form', () => {
    const scan = scanFlowchart(
      codeLines(
        'flowchart LR\n  A --> B\n  B --- C\n  C -.-> D\n  D ==> E\n  E <--> F\n  F ~~~ G\n  G --o H\n  H --x I',
      ),
    );
    expect(scan.nodes.size).toBe(9);
  });

  it('flags a label that is not quoted', () => {
    const issues = lintDiagram(make({ source: 'flowchart LR\n  A[Visor] --> B["b"]' }));
    expect(issues.map((issue) => issue.rule)).toContain('unquoted-label');
    expect(issues.find((issue) => issue.rule === 'unquoted-label')?.line).toBe(2);
  });

  it('allows 6 sequence participants and rejects 7', () => {
    const seq = (count: number) => {
      const lines = ['sequenceDiagram'];
      for (let i = 1; i <= count; i += 1)
        lines.push(`  participant P${String(i)} as Parte ${String(i)}`);
      lines.push('  P1->>P2: hola');
      return make({ kind: 'sequence', source: lines.join('\n') });
    };
    expect(rules(seq(6))).toEqual([]);
    expect(rules(seq(7))).toEqual(['participant-budget']);
  });

  it('counts participants that are only used in messages and notes', () => {
    const found = scanParticipants(
      codeLines(
        [
          'sequenceDiagram',
          '  participant A',
          '  A->>B: x',
          '  B-->>+C: y',
          '  C--)D: z',
          '  Note over D,E: n',
          '  Note right of F: n',
          '  alt ok -> fin',
          '    A->>A: yo',
          '  end',
        ].join('\n'),
      ),
    );
    expect([...found].sort()).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
  });
});

describe('lintDiagram: label length and subgraph titles', () => {
  const LONG = 'x'.repeat(41);

  it('allows 40 characters per line and measures each <br/> line apart', () => {
    expect(rules(make({ source: `flowchart LR\n  A["${'x'.repeat(40)}"]` }))).toEqual([]);
    expect(
      rules(make({ source: `flowchart LR\n  A["${'x'.repeat(40)}<br/>${'y'.repeat(40)}"]` })),
    ).toEqual([]);
    expect(rules(make({ source: `flowchart LR\n  A["${LONG}"]` }))).toEqual(['label-length']);
    expect(rules(make({ source: `flowchart LR\n  A["corto<br/>${LONG}"]` }))).toEqual([
      'label-length',
    ]);
  });

  it('checks the text of sequence messages, notes and aliases, state descriptions and gantt names', () => {
    const sequence = (line: string) =>
      make({
        kind: 'sequence',
        source: `sequenceDiagram\n  participant A\n  participant B\n  ${line}`,
      });
    expect(rules(sequence(`A->>B: ${LONG}`))).toEqual(['label-length']);
    expect(rules(sequence(`Note over A,B: ${LONG}`))).toEqual(['label-length']);
    expect(rules(sequence(`participant C as ${LONG}`))).toEqual(['label-length']);
    expect(rules(sequence(`A->>B: ${'x'.repeat(30)}<br/>${'y'.repeat(30)}`))).toEqual([]);
    expect(
      rules(make({ kind: 'state', source: `stateDiagram-v2\n  [*] --> A\n  A : ${LONG}` })),
    ).toEqual(['label-length']);
    expect(
      rules(
        make({
          kind: 'gantt',
          source: `gantt\n  dateFormat YYYY-MM-DD\n  section S\n  ${LONG} :2026-11-01, 1d`,
        }),
      ),
    ).toEqual(['label-length']);
    expect(
      rules(
        make({
          kind: 'gantt',
          source: `gantt\n  dateFormat YYYY-MM-DD\n  title ${LONG}\n  section S\n  T :2026-11-01, 1d`,
        }),
      ),
    ).toEqual(['label-length']);
  });

  it('rejects a <br/> in a subgraph title, which Mermaid draws over the first node', () => {
    const source = 'flowchart LR\n  subgraph S["Grupo<br/>uno"]\n    A["a"]\n  end';
    expect(rules(make({ source }))).toEqual(['subgraph-break']);
  });
});

describe('the registered diagrams', () => {
  it('pass the static lint', () => {
    const problems = [...DIAGRAMS.values()].flatMap((diagram) => formatIssues(diagram));
    expect(problems).toEqual([]);
  });

  it('use the five kinds only and a catalogue slug as id', () => {
    for (const [id, diagram] of DIAGRAMS) {
      expect(diagram.id).toBe(id);
      expect(['flowchart', 'sequence', 'er', 'state', 'gantt']).toContain(diagram.kind);
    }
  });
});
