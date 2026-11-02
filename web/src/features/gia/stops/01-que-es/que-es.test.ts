import { describe, expect, it } from 'vitest';
import { FACTS } from '../../model/facts';
import { FEATURES } from '../../model/features';
import { SNAPSHOT, STATUS_META } from '../../model/status';
import type { Block } from '../../model/types';
import { repartoPps } from './diagrams';
import { ACCESS_NOTICE, content } from './index';
import { buildFlowSteps } from './steps';

const { section } = content;
const summaryTab = section.tabs.find((tab) => tab.id === 'resumen');

function find<K extends Block['kind']>(
  blocks: readonly Block[],
  kind: K,
): Extract<Block, { kind: K }>[] {
  return blocks.filter((item): item is Extract<Block, { kind: K }> => item.kind === kind);
}

describe('stop 1: structure', () => {
  it('is the cover with the headline of the design and a Quién hace qué tab', () => {
    expect(section.id).toBe('que-es');
    expect(section.group).toBe('recorrido');
    expect(section.headline).toBe(
      'GIA es un visor y anotador web de imágenes médicas gigantes, con permisos por proyecto.',
    );
    expect(section.headline.length).toBeLessThanOrEqual(90);
    expect(section.tabs.map((tab) => tab.id)).toEqual(['resumen', 'quien-hace-que']);
    expect(section.tabs[1]?.blocks).toEqual([{ kind: 'diagram', id: 'reparto-pps' }]);
    expect(content.diagrams.map((diagram) => diagram.id)).toEqual(['reparto-pps']);
    expect(content.tables).toEqual([]);
  });

  it('has 2 to 4 speaker notes and the first one is the talking point', () => {
    expect(section.notes.length).toBeGreaterThanOrEqual(2);
    expect(section.notes.length).toBeLessThanOrEqual(4);
    expect(section.notes[0]).toBe(
      'El servidor está completo; lo que falta es el editor en el navegador.',
    );
  });
});

describe('stop 1: cover', () => {
  const blocks = summaryTab?.blocks ?? [];
  const callouts = find(blocks, 'callout');

  it('opens with the title, the authors and the stamp of the snapshot', () => {
    const cover = callouts[0];
    expect(cover?.title).toBe('GIA · Guía del sistema');
    expect(cover?.text).toContain('Gino Tombesi (PPS 1) · Nahuel Villegas (PPS 2)');
    expect(cover?.text).toContain(SNAPSHOT.label);
    expect(cover?.text).toContain(SNAPSHOT.commit);
  });

  it('states copy C2 verbatim: interface-only, not secret', () => {
    expect(ACCESS_NOTICE).toBe(
      'Visible solo para una sesión con rol administrador global. El contenido no es secreto y la restricción es de la interfaz, no del servidor.',
    );
    expect(callouts.map((item) => item.text)).toContain(ACCESS_NOTICE);
  });

  it('explains what GIA is for and that it does not run models', () => {
    const purpose = callouts.find((item) => item.title === 'Para qué sirve');
    expect(purpose?.text).toContain('no entrena ni ejecuta modelos');
  });

  it('shows the six figures from FACTS, in the order of the design', () => {
    const [stats] = find(blocks, 'stats');
    expect(stats?.items.map((item) => [item.value, item.label])).toEqual([
      [String(FACTS.operations), 'operaciones de la API'],
      [String(FACTS.tileOperations), 'operaciones de teselas'],
      [String(FACTS.tables), 'tablas'],
      [String(FACTS.screens), 'pantallas'],
      [String(FACTS.adrs), 'decisiones (ADR)'],
      [String(FACTS.requirements), 'requisitos de las dos PPS'],
    ]);
  });

  it('introduces the flow, then the stepper, then the legend, in that order', () => {
    const kinds = blocks.map((item) => item.kind);
    const stepper = kinds.indexOf('stepper');
    expect(kinds[stepper - 1]).toBe('callout');
    const intro = blocks[stepper - 1];
    expect(intro?.kind === 'callout' ? intro.title : '').toBe('El flujo completo');
    const legend = blocks[stepper + 1];
    expect(legend?.kind === 'callout' ? legend.title : '').toBe('Cómo leer el estado');
  });

  it('writes the legend from the status table', () => {
    const legend = find(blocks, 'callout').find((item) => item.title === 'Cómo leer el estado');
    for (const meta of Object.values(STATUS_META)) {
      expect(legend?.text).toContain(`${meta.glyph} ${meta.label}`);
    }
  });
});

describe('stop 1: the flow stepper', () => {
  const steps = buildFlowSteps();

  it('has the seven steps from sign-in to export', () => {
    expect(steps.map((step) => step.title)).toEqual([
      'Ingresar',
      'Crear proyecto, dataset y clases',
      'Registrar o subir imágenes',
      'Visualizar',
      'Anotar',
      'Importar anotaciones CRIC',
      'Exportar JSON y COCO',
    ]);
    expect(new Set(steps.map((step) => step.id)).size).toBe(7);
    const [stepper] = find(summaryTab?.blocks ?? [], 'stepper');
    expect(stepper?.steps).toEqual(steps);
  });

  it('reads the web state of the missing screens from FEATURES, never typed', () => {
    const web = Object.fromEntries(steps.map((step) => [step.id, step.web]));
    expect(web['anotar']).toBe(FEATURES.editor.status);
    expect(web['importar']).toBe(FEATURES.importScreen.status);
    expect(web['exportar']).toBe(FEATURES.exportScreen.status);
  });

  it('shows the server side done in every step and the classes without a screen as partial', () => {
    expect(steps.every((step) => step.api === 'done')).toBe(true);
    const catalog = steps.find((step) => step.id === 'catalogo');
    expect(catalog?.web).toBe('partial');
    expect(FEATURES.classesScreen.status).not.toBe('done');
  });

  it('says what is missing in every step that is not fully done', () => {
    for (const step of steps) {
      if (step.api !== 'done' || step.web !== 'done') {
        expect((step.note ?? '').trim(), step.id).not.toBe('');
      }
    }
  });
});

describe('stop 1: out of scope', () => {
  it('lists it in the detail, hidden in presentation mode, as documented extensions', () => {
    const detail = section.detail ?? [];
    const [list] = find(detail, 'list');
    expect(list?.items.length).toBeGreaterThanOrEqual(6);
    const [intro] = find(detail, 'callout');
    expect(intro?.text).toContain('nada de esto está construido');
  });
});

describe('diagram G01 reparto-pps', () => {
  const { source } = repartoPps;

  it('is a flowchart with the three groups and the ownership as text', () => {
    expect(repartoPps.kind).toBe('flowchart');
    expect(repartoPps.usesStatus).toBe(true);
    expect(source).toContain('subgraph P1["PPS 1 · Gino Tombesi"]');
    expect(source).toContain('subgraph P2["PPS 2 · Nahuel Villegas"]');
    expect(source).toContain('subgraph CO["Compartido"]');
  });

  it('draws the editor from FEATURES, dashed to the viewer, the SPA and the annotations', () => {
    const editorLine = source.split('\n').find((line) => line.trim().startsWith('E['));
    expect(editorLine).toContain(`:::${FEATURES.editor.status}`);
    expect(editorLine).toContain(STATUS_META[FEATURES.editor.status].glyph);
    const dashed = source.split('\n').filter((line) => line.includes('-.->'));
    expect(dashed).toHaveLength(3);
    expect(dashed[0]).toContain('ADR-08 propuesto, S1 sin respuesta');
  });

  it('keeps within the budget of 14 nodes and writes no styles by hand', () => {
    const nodes = source.split('\n').filter((line) => /^\s+[A-Z]+\["/.test(line));
    expect(nodes.length).toBeLessThanOrEqual(14);
    expect(source).not.toMatch(/classDef|linkStyle|\bstyle\b|%%\{|click |<script/);
  });

  it('never mentions a port number', () => {
    expect(source).not.toMatch(/:\d{4}/);
  });
});
