// @vitest-environment jsdom
// Mermaid's flowchart and state parsers need a DOM (DOMPurify), so this is the only test file
// that runs under jsdom; every other test keeps the default node environment.
import mermaid from 'mermaid';
import { describe, expect, it } from 'vitest';
import { DIAGRAMS } from '../model/registry';
import { FALLBACK_PALETTE } from './mermaidTheme';
import { styledSource, withStatusStyles } from './withStatusStyles';

async function parseKind(source: string): Promise<string | false> {
  const result = await mermaid.parse(source, { suppressErrors: true });
  return result === false ? false : result.diagramType;
}

describe('mermaid.parse under jsdom', () => {
  it('accepts the five diagram kinds the guide uses and rejects broken syntax', async () => {
    expect(await parseKind('flowchart LR\n  A["a"] --> B["b"]')).toMatch(/^flowchart/);
    expect(await parseKind('sequenceDiagram\n  participant A\n  A->>A: hi')).toBe('sequence');
    expect(await parseKind('erDiagram\n  A ||--o{ B : has')).toBe('er');
    expect(await parseKind('stateDiagram-v2\n  [*] --> A')).toMatch(/^state/);
    expect(
      await parseKind('gantt\n  dateFormat YYYY-MM-DD\n  section S\n  T :2026-11-01, 1d'),
    ).toBe('gantt');
    expect(await parseKind('flowchart LR\n  A["a" --> ')).toBe(false);
  });

  // One case per catalogue diagram: a typo in any source fails here, not in front of the audience.
  it.each([...DIAGRAMS.values()].map((diagram) => [diagram.id, diagram.source] as const))(
    'parses the source of diagram %s',
    async (_id, source) => {
      expect(await parseKind(source)).not.toBe(false);
    },
  );
});

const join = (...lines: string[]): string => lines.join('\n');

// The constructs the diagram authors rely on, and the status styles the engine appends to them.
describe('syntax the engine and the authors depend on', () => {
  it('accepts <br/> inside quoted labels, edge labels and ER relationship labels', async () => {
    const flowchart = join(
      'flowchart LR',
      '  A["uno<br/>dos"] -->|"borde<br/>dos"| B["tres"]',
      '  subgraph S["Grupo"]',
      '    C["c"]',
      '  end',
    );
    expect(await parseKind(flowchart)).toMatch(/^flowchart/);
    expect(await parseKind('erDiagram\n  a ||--o{ b : "ON DELETE<br/>CASCADE"')).toBe('er');
    expect(await parseKind('sequenceDiagram\n  A->>B: linea<br/>dos')).toBe('sequence');
  });

  it('accepts a sequence rect that contains a Note', async () => {
    const source = join(
      'sequenceDiagram',
      '  participant A',
      '  participant B',
      '  rect rgba(128, 128, 128, 0.18)',
      '    A->>B: dibuja',
      '    Note over A,B: PLANIFICADO',
      '  end',
    );
    expect(await parseKind(source)).toBe('sequence');
  });

  it('accepts ER attribute keys and comments', async () => {
    const source = join(
      'erDiagram',
      '  users {',
      '    uuid id PK "identificador"',
      '    string username UK "nombre único"',
      '    uuid project_id FK "proyecto (no secreto)"',
      '  }',
    );
    expect(await parseKind(source)).toBe('er');
  });

  it('accepts the classDef block appended to a flowchart, a state and an ER diagram', async () => {
    const flowchart = withStatusStyles(
      join(
        'flowchart LR',
        '  A["● a"]:::done --> B["○ b"]:::planned',
        '  C["◐ c"]:::partial --> D["? d"]:::unknown',
      ),
      FALLBACK_PALETTE,
      'flowchart',
    );
    const state = withStatusStyles(
      join(
        'stateDiagram-v2',
        '  state "● a" as A',
        '  state "○ b" as B',
        '  [*] --> A',
        '  A --> B',
        '  A:::done',
        '  class B planned',
      ),
      FALLBACK_PALETTE,
      'state',
    );
    const er = withStatusStyles(
      join(
        'erDiagram',
        '  users:::done {',
        '    uuid id PK',
        '  }',
        '  review:::planned {',
        '    int id PK',
        '  }',
        '  users ||--o{ review : "revisa"',
      ),
      FALLBACK_PALETTE,
      'er',
    );
    expect(await parseKind(flowchart)).toMatch(/^flowchart/);
    expect(await parseKind(state)).toMatch(/^state/);
    expect(await parseKind(er)).toBe('er');
  });

  // The source Mermaid really receives: the registered text plus the appended status styles.
  it.each([...DIAGRAMS.values()].map((diagram) => [diagram.id, diagram] as const))(
    'parses diagram %s with its status styles applied',
    async (_id, diagram) => {
      expect(await parseKind(styledSource(diagram, FALLBACK_PALETTE))).not.toBe(false);
    },
  );
});
