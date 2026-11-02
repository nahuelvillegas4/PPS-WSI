// @vitest-environment jsdom
// Mermaid's flowchart and state parsers need a DOM (DOMPurify), so this is the only test file
// that runs under jsdom; every other test keeps the default node environment.
import mermaid from 'mermaid';
import { describe, expect, it } from 'vitest';
import { DIAGRAMS } from '../model/registry';

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
