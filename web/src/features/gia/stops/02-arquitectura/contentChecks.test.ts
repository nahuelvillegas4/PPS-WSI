import { describe, expect, it } from 'vitest';
import type { DiagramDef } from '../../model/types';
import {
  flowchartNodeIds,
  forbiddenInContent,
  forbiddenInSource,
  longLines,
  participantCount,
  statusMismatches,
} from './contentChecks.testing';

const make = (kind: DiagramDef['kind'], source: string): DiagramDef => ({
  id: 'x',
  kind,
  title: 'x',
  summary: 'x',
  source,
  usesStatus: false,
  sources: [],
  priority: 'P1',
});

describe('content check helpers', () => {
  it('reports label lines over 40 characters, counting each <br/> line apart', () => {
    const long = 'a'.repeat(41);
    const flow = make('flowchart', `flowchart LR\n  A["ok<br/>${long}"] --> B["short"]`);
    expect(longLines(flow)).toEqual([long]);
    const seq = make('sequence', `sequenceDiagram\n  A->>B: ${long}\n  Note over A: fine<br/>fine`);
    expect(longLines(seq)).toEqual([long]);
    const state = make('state', `stateDiagram-v2\n  note right of A\n    ${long}\n  end note`);
    expect(longLines(state)).toEqual([long]);
  });

  it('counts distinct flowchart nodes through edges, labels and shapes', () => {
    const source = [
      'flowchart TB',
      '  subgraph g["Group"]',
      '    a["A"]:::done',
      '    b[("B")]',
      '  end',
      '  a -->|"x"| b',
      '  b -.-> c',
      '  c ---|"y"| a',
    ].join('\n');
    expect([...flowchartNodeIds(source)].sort()).toEqual(['a', 'b', 'c']);
  });

  it('counts sequence participants', () => {
    expect(
      participantCount('sequenceDiagram\n  participant A as a\n  actor B as b\n  A->>B: hi'),
    ).toBe(2);
  });

  it('names forbidden constructs in a source: styles, colours, init directives and ports', () => {
    expect(forbiddenInSource('flowchart LR\n  A["a"]')).toEqual([]);
    expect(
      forbiddenInSource('flowchart LR\n  classDef x fill:#fff\n  style A fill:#ff0000'),
    ).toEqual(expect.arrayContaining(['classDef', 'style', 'hex colour']));
    expect(forbiddenInSource('%%{init: {}}%%\nflowchart LR')).toContain('init directive');
    expect(forbiddenInSource('flowchart LR\n  A["host:8080"]')).toContain('port number');
  });

  it('flags an inline class whose glyph does not match its status', () => {
    expect(statusMismatches('  a["● Ok"]:::done\n  b[("◐ Mid")]:::partial')).toEqual([]);
    expect(statusMismatches('  a["○ Wrong"]:::done')).toHaveLength(1);
    expect(statusMismatches('  a["No glyph"]:::done')).toHaveLength(1);
  });

  it('finds overpromising words and ignores evidence refs', () => {
    expect(forbiddenInContent({ text: `La página está ${'prote' + 'gida'}` })).toEqual([
      'promise: protected',
    ]);
    expect(forbiddenInContent(['aprob' + 'ada', 'seg' + 'ura'])).toEqual([
      'promise: approved',
      'promise: safe',
    ]);
    expect(
      forbiddenInContent({ ref: 'api/Controller.cs:42', text: 'aprobación de la supervisión' }),
    ).toEqual([]);
  });
});
