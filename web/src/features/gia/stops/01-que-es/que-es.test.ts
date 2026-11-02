import { describe, expect, it } from 'vitest';
import { ADRS } from '../../data/adrs';
import { parseAdrIndex } from '../../drift/checks';
import { findRepoText, readRepoFile } from '../../drift/repoFiles.testing';
import { statusStyles } from '../../engine/withStatusStyles';
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
  it('is the cover with a headline that claims no editor, and a Reparto previsto tab', () => {
    expect(section.id).toBe('que-es');
    expect(section.group).toBe('recorrido');
    expect(section.headline).toBe(
      'GIA es un visor web de imágenes médicas gigantes; hoy se anota solo por la API.',
    );
    expect(section.headline.length).toBeLessThanOrEqual(90);
    // The headline may not say the browser annotates while the editor is a planned item.
    expect(FEATURES.editor.status).not.toBe('done');
    expect(section.headline).not.toMatch(/anotador/);
    expect(section.tabs.map((tab) => tab.id)).toEqual(['resumen', 'reparto-previsto']);
    expect(section.tabs[1]?.blocks).toEqual([{ kind: 'diagram', id: 'reparto-pps' }]);
    expect(content.diagrams.map((diagram) => diagram.id)).toEqual(['reparto-pps']);
    expect(content.tables).toEqual([]);
  });

  it('has 2 to 4 speaker notes and the first one is the talking point', () => {
    expect(section.notes.length).toBeGreaterThanOrEqual(2);
    expect(section.notes.length).toBeLessThanOrEqual(4);
    expect(section.notes[0]).toBe(
      `La API y las teselas implementan las ${String(FACTS.operations + FACTS.tileOperations)} operaciones del contrato; en el navegador faltan el editor y tres pantallas.`,
    );
  });

  it('does not call the server complete, and names what is still only proposed', () => {
    const notes = section.notes.join(' ');
    expect(notes).not.toMatch(/servidor está completo/);
    expect(notes).toContain('ADR-16');
    expect(notes).toContain('YOLO');
    expect(notes).toContain('pruebas por HTTP');
    // "tres pantallas" and the break of the flow at the classes hold while these stay planned.
    for (const id of [
      'editor',
      'classesScreen',
      'importScreen',
      'exportScreen',
      'sessionValidator',
      'csrfGuard',
      'yolo',
      'httpTests',
    ] as const) {
      expect(FEATURES[id].status, id).not.toBe('done');
    }
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

  it('says that annotating is only possible through the API and that the project roles are proposed', () => {
    const purpose = callouts.find((item) => item.title === 'Para qué sirve');
    expect(purpose?.text).toContain('por la API, anotarlas; el editor en el navegador falta');
    expect(purpose?.text).toContain('los ADR-15 y ADR-16 son propuestas sin aprobación registrada');
    expect(purpose?.text).not.toMatch(/ver y anotar/);
  });

  it('shows the six figures from FACTS, in the order of the design', () => {
    const [stats] = find(blocks, 'stats');
    expect(stats?.items.map((item) => [item.value, item.label])).toEqual([
      [String(FACTS.operations), 'operaciones de la API'],
      [String(FACTS.tileOperations), 'operaciones de teselas'],
      [String(FACTS.tables), 'tablas'],
      [String(FACTS.screens), 'pantallas'],
      [String(FACTS.adrs), 'ADR (10 decididos, 7 propuestos)'],
      [String(FACTS.requirements), 'requisitos (desglose propio de los enunciados)'],
    ]);
  });

  it('splits the ADRs as docs/adr/README.md does, and the split adds up to the total', async () => {
    const index = parseAdrIndex(await readRepoFile('docs/adr/README.md'));
    const decided = [...index.values()].filter((decision) => decision === 'DECIDIDO').length;
    const proposed = [...index.values()].filter((decision) => decision === 'PROPUESTO').length;
    expect(decided + proposed).toBe(FACTS.adrs);
    expect(ADRS.filter((adr) => adr.decision === 'DECIDIDO')).toHaveLength(decided);
    const [stats] = find(blocks, 'stats');
    expect(stats?.items.map((item) => item.label)).toContain(
      `ADR (${String(decided)} decididos, ${String(proposed)} propuestos)`,
    );
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

  it('describes the outlines as the diagrams draw them: partial is solid, planned is dashed', () => {
    const styles = statusStyles({
      bg: '#112233',
      surface: '#445566',
      text: '#778899',
      muted: '#aabbcc',
      border: '#ddeeff',
      accent: '#13579b',
      warning: '#2468ac',
      dark: false,
    });
    expect(styles.done.dash).toBeUndefined();
    expect(styles.partial.dash).toBeUndefined();
    expect(styles.planned.dash).toBeDefined();
    expect(styles.unknown.dash).toBeDefined();
    expect(styles.unknown.dash).not.toBe(styles.planned.dash);
    const legend = find(blocks, 'callout').find((item) => item.title === 'Cómo leer el estado');
    expect(legend?.text).toContain(
      'el borde continuo marca lo construido y lo construido en parte',
    );
    expect(legend?.text).toContain('el borde discontinuo, lo planificado');
    expect(legend?.text).toContain('el de puntos, lo sin decidir');
    expect(legend?.text).not.toContain('lo que falta');
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
  const detail = section.detail ?? [];
  const [list] = find(detail, 'list');
  const [intro] = find(detail, 'callout');

  it('lists it in the detail, hidden in presentation mode, and says nothing of it is built', () => {
    expect(list?.items).toHaveLength(8);
    expect(intro?.text).toContain('Nada de esto está construido');
  });

  it('marks five items with an extension point and the others as only named', () => {
    const items = list?.items ?? [];
    expect(items.filter((item) => item.includes('punto de extensión'))).toHaveLength(5);
    expect(items.filter((item) => item.includes('solo nombrado'))).toHaveLength(2);
    const collaborative = items.find((item) => item.startsWith('Edición colaborativa'));
    expect(collaborative).toContain('solo en el enunciado de la PPS 2');
    expect(intro?.text).toContain('la edición colaborativa, solo el de la PPS 2');
    expect(intro?.text).toContain('para cinco de los ocho');
    expect(intro?.text).toContain('los otros tres no lo tienen');
  });

  it('matches the architecture document: section 5.4 has those five hooks and no more', async () => {
    const doc = await readRepoFile('docs/arquitectura/03-bloques-y-ejecucion.md');
    const start = doc.indexOf('### 5.4 Puntos de extensión');
    expect(start).toBeGreaterThan(-1);
    const table = doc.slice(start, doc.indexOf('\n## ', start));
    for (const hook of [
      'DICOM WSI',
      'Preanotaciones',
      'Active learning',
      'Consenso y métricas de acuerdo',
      'Nuevos formatos',
    ]) {
      expect(table, hook).toContain(hook);
    }
    // If a hook is ever added for one of the other three, the page has to say so.
    expect(table).not.toMatch(/colaborativ|dashboard|paneles|versionado de datasets/i);
  }, 30_000);

  it('finds the collaborative editing in no document of the repository', async () => {
    const hits = await findRepoText({
      in: ['docs/**', 'contract/**', 'deploy/**', 'README.md'],
      pattern: 'colaborativ',
    });
    expect(hits).toEqual([]);
  }, 30_000);
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
    expect(dashed[0]).toContain('ADR-08 propuesto, S1 pendiente');
  });

  it('keeps within the budget of 14 nodes and writes no styles by hand', () => {
    const nodes = source.split('\n').filter((line) => /^\s+[A-Z]+\["/.test(line));
    expect(nodes.length).toBeLessThanOrEqual(14);
    expect(source).not.toMatch(/classDef|linkStyle|\bstyle\b|%%\{|click |<script/);
  });

  it('never mentions a port number', () => {
    expect(source).not.toMatch(/:\d{4}/);
  });

  it('is a planned split, not the authorship, and does not say the supervision failed to answer', () => {
    expect(repartoPps.title).toBe('Reparto previsto');
    expect(repartoPps.caption).toContain('no la autoría de lo construido');
    expect(repartoPps.caption).toContain('pendiente de decisión de la supervisión');
    const text = [repartoPps.caption, repartoPps.summary, source].join(' ');
    expect(text).not.toMatch(/sin respuesta|no respondi/i);
  });
});
