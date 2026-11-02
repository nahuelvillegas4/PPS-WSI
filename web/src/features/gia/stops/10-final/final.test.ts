import { describe, expect, it } from 'vitest';
import { parseRoute } from '../../../../shared/router';
import { matchRepoGlob, readRepoFile } from '../../drift/repoFiles.testing';
import { g } from '../../model/diagramKit';
import { FEATURES, type FeatureId } from '../../model/features';
import { STATUS_META } from '../../model/status';
import type { Block, DiagramDef, TableDef } from '../../model/types';
import { ACCEPTANCE } from './acceptance';
import { FINAL_STATE_TITLE } from './diagrams';
import { content } from './index';
import { BUILT_SCREENS, EXTRA_SCREEN_FEATURES, PROPOSED_SCREENS } from './screens';
import {
  CLAIM_PATTERNS,
  DEPLOYMENT_DENIED,
  LEAK_PATTERNS,
  evidenceProblems,
  flowchartProblems,
  glyphOfNode,
  matchesOf,
} from './unitChecks.testing';

function diagram(id: string): DiagramDef {
  const found = content.diagrams.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Diagram not defined by the stop: ${id}`);
  return found;
}

function table(id: string): TableDef {
  const found = content.tables.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Table not defined by the stop: ${id}`);
  return found;
}

const allBlocks: Block[] = content.section.tabs.flatMap((tab) => [...tab.blocks]);

describe('stop 10 (final): section', () => {
  const { section } = content;

  it('is the final-state stop of the walk-through, two minutes long', () => {
    expect(section.id).toBe('final');
    expect(section.group).toBe('recorrido');
    expect(section.minutes).toBe(2);
    expect(section.headline.length).toBeLessThanOrEqual(90);
  });

  it('has 2 to 4 speaker notes and opens with the sentence to say aloud', () => {
    expect(section.notes.length).toBeGreaterThanOrEqual(2);
    expect(section.notes.length).toBeLessThanOrEqual(4);
    expect(section.notes[0]).toBe('Así termina; lo que falta lo decide la supervisión.');
  });

  it('has the three tabs in order, each opening with its diagram', () => {
    expect(section.tabs.map((tab) => tab.id)).toEqual(['despliegue', 'pantallas', 'aceptacion']);
    const heroes = section.tabs.map((tab) => tab.blocks[0]);
    expect(heroes).toEqual([
      { kind: 'diagram', id: 'estado-final' },
      { kind: 'diagram', id: 'mapa-pantallas' },
      { kind: 'diagram', id: 'aceptacion' },
    ]);
  });

  it('references each diagram it defines exactly once', () => {
    const referenced = allBlocks.flatMap((block) => (block.kind === 'diagram' ? [block.id] : []));
    expect([...referenced].sort()).toEqual(content.diagrams.map((d) => d.id).sort());
  });

  it('defines aceptacion and only references pantallas, which the architecture stop defines', () => {
    const referenced = allBlocks.flatMap((block) => (block.kind === 'table' ? [block.id] : []));
    expect(referenced).toEqual(['pantallas', 'aceptacion']);
    expect(content.tables.map((t) => t.id)).toEqual(['aceptacion']);
  });

  it('shows the four wireframes after the table of screens', () => {
    const pantallas = section.tabs.find((tab) => tab.id === 'pantallas');
    const kinds = pantallas?.blocks.map((block) => block.kind);
    expect(kinds).toEqual(['diagram', 'table', 'wireframe', 'wireframe', 'wireframe', 'wireframe']);
    const ids = allBlocks.flatMap((block) => (block.kind === 'wireframe' ? [block.id] : []));
    expect(ids).toEqual(['editor', 'import', 'export', 'classes']);
  });
});

describe('estado-final (G21)', () => {
  const final = diagram('estado-final');

  it('is titled with the agreed wording: proposed, and not confirmed by the supervision', () => {
    expect(final.title).toBe(FINAL_STATE_TITLE);
    expect(final.title).toBe(
      'Estado final propuesto (v0.9, 28/09/2026), no confirmado por la supervisión',
    );
  });

  it('shows no port, host, address or operating system in its source, summary or caption', () => {
    expect(matchesOf([final.source, final.summary, final.caption], DEPLOYMENT_DENIED)).toEqual([]);
  });

  it('obeys the flowchart rules: node and label budgets, glyph with class, no styles', () => {
    expect(flowchartProblems(final.source)).toEqual([]);
    expect(final.usesStatus).toBe(true);
  });

  it('marks the lab server, the way in from outside and TLS as undecided', () => {
    expect(final.source).toContain(`${g('unknown')} Servidor del laboratorio o VM`);
    expect(final.source).toContain('class SRV unknown');
    expect(glyphOfNode(final.source, 'TLS')).toBe(g('tls'));
    expect(FEATURES.tls.status).toBe('unknown');
  });

  it('takes the mark of each operation piece from its tripwire', () => {
    const pieces: Record<string, FeatureId> = {
      BK: 'backup',
      SM: 'smoke',
      FS: 'fetchSamples',
      RS: 'composeServer',
      CI: 'ci',
    };
    for (const [node, feature] of Object.entries(pieces)) {
      expect(glyphOfNode(final.source, node)).toBe(g(feature));
    }
  });

  it('draws the parts that exist today as implemented', () => {
    for (const node of ['GW', 'API', 'TIL', 'DB', 'IMG', 'VOL']) {
      expect(glyphOfNode(final.source, node)).toBe(STATUS_META.done.glyph);
    }
  });

  it('does not say the ports of the API and the database are already limited', () => {
    expect(glyphOfNode(final.source, 'NOTE')).toBe(STATUS_META.planned.glyph);
    expect(final.source).toContain('(propuesto en el ADR-16)');
  });
});

describe('mapa-pantallas (G19)', () => {
  const map = diagram('mapa-pantallas');

  it('obeys the flowchart rules', () => {
    expect(flowchartProblems(map.source)).toEqual([]);
  });

  it('draws the proposed screens with the mark of their tripwire and the "no design" label', () => {
    for (const screen of PROPOSED_SCREENS) {
      expect(glyphOfNode(map.source, screen.id)).toBe(g(screen.ref));
    }
    expect(map.source.match(/PROPUESTA, sin diseño/g)).toHaveLength(PROPOSED_SCREENS.length);
  });

  it('draws the editor and the other planned screens with dashed edges', () => {
    for (const edge of ['VIEW -.-> EDIT', 'CAT -.-> CLS', 'CAT -.-> IMP', 'CAT -.-> EXP']) {
      expect(map.source).toContain(edge);
    }
  });

  it('keeps the headline true: the editor plus three more screens are still planned', () => {
    const stillPlanned = EXTRA_SCREEN_FEATURES.filter(
      (feature) => FEATURES[feature].status === 'planned',
    );
    expect(stillPlanned).toHaveLength(3);
    expect(content.section.headline).toContain('tres pantallas más');
  });

  it('has a folder in the SPA for every built screen', () => {
    for (const screen of BUILT_SCREENS) {
      expect(screen.folder).toBeDefined();
      expect(matchRepoGlob(`web/src/features/${screen.folder ?? ''}/**`).length).toBeGreaterThan(0);
    }
  });

  it('draws exactly the routes the app handles, and each one resolves through parseRoute', async () => {
    const app = await readRepoFile('web/src/app/App.tsx');
    const handled = [...app.matchAll(/case '(\w+)':/g)].map((match) => match[1]).sort();
    const drawn = BUILT_SCREENS.flatMap((screen) => (screen.route ? [screen.route] : [])).sort();
    expect(drawn).toEqual(handled);

    const samples = {
      catalog: '/',
      viewer: '/images/1',
      members: '/projects/1/members',
      users: '/admin/users',
      gia: '/gia',
    } as const;
    for (const screen of BUILT_SCREENS) {
      if (screen.route) expect(parseRoute(samples[screen.route], '').name).toBe(screen.route);
    }
  });

  it('counts the screens it announces in its summary', () => {
    expect(map.summary).toContain(`${BUILT_SCREENS.length} existen`);
    expect(map.summary).toContain(`${PROPOSED_SCREENS.length} son propuestas`);
  });
});

describe('aceptacion (G20 and table)', () => {
  const steps = diagram('aceptacion');
  const criteria = table('aceptacion');

  it('has the five steps of the demonstration in order, joined by arrows', () => {
    expect(ACCEPTANCE.map((step) => step.id)).toEqual([
      'importar',
      'anotar',
      'verificar',
      'exportar',
      'servidor',
    ]);
    expect(flowchartProblems(steps.source)).toEqual([]);
    for (const edge of ['A1 --> A2', 'A2 --> A3', 'A3 --> A4', 'A4 --> A5']) {
      expect(steps.source).toContain(edge);
    }
  });

  it('gives each step in the diagram the same status as its row in the table', () => {
    ACCEPTANCE.forEach((step, index) => {
      expect(glyphOfNode(steps.source, `A${index + 1}`)).toBe(STATUS_META[step.status].glyph);
      expect(criteria.rows[index]?.estado).toEqual({ status: step.status });
    });
  });

  it('says annotating works today only over HTTP, and exporting only through the API', () => {
    expect(steps.source).toContain('hoy solo por HTTP');
    expect(steps.source).toContain('por API');
    expect(criteria.rows[1]?.hoy).toContain('Solo por HTTP');
  });

  it('counts the footer from the rows', () => {
    const footer = criteria.footer?.estado;
    expect(footer).toBeDefined();
    const chips =
      footer !== undefined && typeof footer === 'object' && 'chips' in footer ? footer.chips : [];
    const total = chips.reduce((sum, chip) => sum + Number(/(\d+)$/.exec(chip.label)?.[1]), 0);
    expect(total).toBe(criteria.rows.length);
    for (const chip of chips) {
      const status = chip.status;
      const expected = ACCEPTANCE.filter((step) => step.status === status).length;
      expect(chip.label).toBe(`${STATUS_META[status].label}: ${expected}`);
    }
  });

  it('lists as missing for the server only the pieces that are still not built', () => {
    const missing = ACCEPTANCE[4]?.missing ?? '';
    const pieces: FeatureId[] = ['composeServer', 'smoke', 'fetchSamples', 'ci'];
    for (const piece of pieces) {
      expect(missing.includes(FEATURES[piece].label.toLowerCase())).toBe(
        FEATURES[piece].status !== 'done',
      );
    }
    expect(missing).toContain('S2, S3');
  });

  it('has the columns of the agreed table, plus the status of each criterion', () => {
    expect(criteria.columns.map((column) => column.label)).toEqual([
      'Criterio',
      'Hoy se demuestra por',
      'Falta',
      'Estado',
    ]);
    expect(criteria.rows).toHaveLength(5);
  });
});

describe('stop 10 (final): evidence and wording', () => {
  it('cites only files that exist, with line ranges inside them', async () => {
    const sources = [...content.diagrams, ...content.tables].flatMap((item) => [...item.sources]);
    expect(sources.length).toBeGreaterThan(0);
    expect(await evidenceProblems(sources)).toEqual([]);
  });

  it('never claims approval, acceptance or protection, and leaks no secret or port', () => {
    expect(matchesOf(content, CLAIM_PATTERNS)).toEqual([]);
    expect(matchesOf(content, LEAK_PATTERNS)).toEqual([]);
  });

  it('gives every diagram and table a title, a summary or caption and sources', () => {
    for (const item of content.diagrams) {
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.summary.length).toBeGreaterThan(0);
      expect(item.sources.length).toBeGreaterThan(0);
    }
    for (const item of content.tables) {
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.sources.length).toBeGreaterThan(0);
    }
  });
});
