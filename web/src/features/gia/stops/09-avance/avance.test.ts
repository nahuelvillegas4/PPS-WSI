/**
 * Drift tests of the progress stop: the gantt against the roadmap and the git history, the
 * epics against the tripwires and the code, and the debt rows against the lines they cite.
 */
import { describe, expect, it } from 'vitest';
import {
  CLAIMS_DENYLIST,
  LEAK_DENYLIST,
  checkSectionShape,
  collectStrings,
  findDenied,
  hasBuiltProof,
  stripEvidenceRef,
} from '../../drift/checks';
import { readRepoFile, repoPathExists } from '../../drift/repoFiles.testing';
import { formatIssues } from '../../engine/diagramLint';
import { g } from '../../model/diagramKit';
import { FEATURES } from '../../model/features';
import { SNAPSHOT } from '../../model/status';
import type { Cell } from '../../model/types';
import {
  DONE,
  PLAN,
  PLAN_WEEK_1,
  PPS1_CLOSES,
  PPS2_CLOSES,
  addDays,
  daysBetween,
  hojaDeRuta,
  type PlanBar,
} from './diagrams';
import { content, NEXT_STEPS } from './index';
import { DEBT, EPICS, deudaSeguridadTable, epicasTable } from './tables';

function span(bar: PlanBar): [string, string] {
  return [bar.start, addDays(bar.start, bar.days - 1)];
}

function ddmm(isoDate: string): string {
  const [, month, day] = isoDate.split('-');
  return `${day ?? ''}/${month ?? ''}`;
}

function statusOfCell(cell: Cell | undefined): string | undefined {
  return typeof cell === 'object' && 'status' in cell ? cell.status : undefined;
}

describe('hoja-de-ruta (gantt)', () => {
  it('is a gantt with YYYY-MM-DD dates, the todayMarker of the cut and the fixed caption', () => {
    expect(hojaDeRuta.kind).toBe('gantt');
    expect(hojaDeRuta.id).toBe('hoja-de-ruta');
    expect(hojaDeRuta.source.startsWith('gantt\n')).toBe(true);
    expect(hojaDeRuta.source).toContain('    dateFormat YYYY-MM-DD');
    // The cut is the 02/11/2026: when SNAPSHOT moves, the "done" bars below need a new look.
    expect(hojaDeRuta.source, 'Al actualizar SNAPSHOT revisá las barras de "Hecho"').toContain(
      'todayMarker 2026-11-02',
    );
    expect(hojaDeRuta.caption).toBe('La fecha de git es una cota superior del trabajo.');
    expect(hojaDeRuta.title).toBe('Plan frente a lo hecho (corte 02/11/2026)');
    expect(hojaDeRuta.usesStatus).toBe(false);
  });

  it('has the two sections and the milestone of the editor at the cut', () => {
    const lines = hojaDeRuta.source.split('\n').map((line) => line.trim());
    expect(lines.filter((line) => line.startsWith('section '))).toEqual([
      'section Plan (hoja de ruta v0.9)',
      'section Hecho (fecha de commit, cota superior)',
    ]);
    expect(lines).toContain('Editor en la SPA (sin empezar) :milestone, 2026-11-02, 0d');
    // The milestone says "not started": it must change when the editor is built.
    expect(FEATURES.editor.status, 'El editor ya existe: actualizá el hito de hoja-de-ruta').toBe(
      'planned',
    );
  });

  it('draws the plan of the roadmap: week 1 is a Monday and each increment spans its weeks', () => {
    expect(new Date(`${PLAN_WEEK_1}T00:00:00Z`).getUTCDay()).toBe(1);
    expect(PLAN.map((bar) => [bar.label.split(' ')[0], ...span(bar)])).toEqual([
      ['I0', '2026-10-19', '2026-10-25'],
      ['I1', '2026-10-26', '2026-11-08'],
      ['I2', '2026-11-02', '2026-11-15'],
      ['I3', '2026-11-16', '2026-11-29'],
      ['I4', '2026-11-30', PPS2_CLOSES],
      ['I5', '2026-11-30', PPS1_CLOSES],
    ]);
    expect(daysBetween('2026-10-19', '2026-11-02')).toBe(14);
  });

  it('matches the weeks and the closing days that the repository documents', async () => {
    const weeksOf: Record<string, [number, number]> = {
      I0: [1, 1],
      I1: [2, 3],
      I2: [3, 4],
      I3: [5, 6],
      I4: [7, 7],
      I5: [7, 9],
    };
    const logbook = (await readRepoFile('docs/BITACORA_PPS1.md')).split('\n');
    const roadmap = (await readRepoFile('docs/arquitectura/06-organizacion-y-roadmap.md')).split(
      '\n',
    );
    for (const [code, [from, to]] of Object.entries(weeksOf)) {
      const logbookRow = logbook.find((line) => line.includes(`${code} ·`)) ?? '';
      for (let week = from; week <= to; week += 1) {
        const start = ddmm(addDays(PLAN_WEEK_1, 7 * (week - 1)));
        expect(
          logbookRow,
          `${code}: la bitácora de la PPS 1 no trae la semana del ${start}`,
        ).toContain(start);
      }
      const roadmapRow = roadmap.find((line) => line.startsWith(`| ${code} ·`)) ?? '';
      const weeks = roadmapRow.split('|')[2]?.trim() ?? '';
      expect(weeks.startsWith(String(from)), `${code}: semanas del roadmap "${weeks}"`).toBe(true);
      if (to > from) expect(weeks).toContain(`${from}–${to}`);
    }
    expect(logbook.join('\n')).toContain('La semana 1 empieza el lunes 19/10/2026');
    expect(logbook.join('\n')).toContain('cierra el 03/12');
    expect(logbook.join('\n')).toContain('16/12/2026');
  });

  it('puts what was done on the dates of the commits (git log 2584cfc, 02/11/2026)', () => {
    expect(DONE.map(({ bar, tags }) => [bar.label, ...span(bar), tags.trim()])).toEqual([
      ['Base, teselas y contrato 0.1', '2026-10-17', '2026-10-17', 'done,'],
      ['API hasta I3', '2026-10-17', '2026-10-28', 'done,'],
      ['Ingreso y catálogo web', '2026-10-24', '2026-10-24', 'active,'],
      ['Roles y subida (en main, sin aprobación)', '2026-10-31', '2026-11-01', 'crit, active,'],
    ]);
    for (const { bar } of DONE) {
      expect(span(bar)[1] <= SNAPSHOT.date, bar.label).toBe(true);
    }
  });

  it('cites its sources, passes the static lint and says nothing it should not', () => {
    expect(hojaDeRuta.sources.length).toBeGreaterThan(0);
    for (const source of hojaDeRuta.sources.filter((evidence) => evidence.kind !== 'git')) {
      expect(repoPathExists(stripEvidenceRef(source.ref)), source.ref).toBe(true);
    }
    expect(formatIssues(hojaDeRuta)).toEqual([]);
    const strings = collectStrings(hojaDeRuta, 'diagram');
    expect(findDenied(strings, CLAIMS_DENYLIST, { showMatch: true })).toEqual([]);
    expect(findDenied(strings, LEAK_DENYLIST)).toEqual([]);
  });
});

describe('epicas', () => {
  const table = epicasTable();

  it('has the epics E1 to E11, in order, with the columns of the design', () => {
    expect(EPICS.map((row) => row.epic.split(' ')[0])).toEqual(
      Array.from({ length: 11 }, (_, i) => `E${String(i + 1)}`),
    );
    expect(table.columns.map((column) => column.label)).toEqual([
      'Épica',
      'API o servicio',
      'Interfaz',
      'Evidencia',
    ]);
    expect(table.rows).toHaveLength(11);
  });

  it('reads the status of the unbuilt screens from the tripwires, never from a typed value', () => {
    const byEpic = (id: string) => EPICS.find((row) => row.epic.startsWith(`${id} `));
    expect(statusOfCell(byEpic('E6')?.web)).toBe(FEATURES.editor.status);
    expect(statusOfCell(byEpic('E7')?.web)).toBe(FEATURES.editor.status);
    expect(statusOfCell(byEpic('E8')?.web)).toBe(FEATURES.importScreen.status);
    expect(statusOfCell(byEpic('E9')?.web)).toBe(FEATURES.exportScreen.status);
    expect(statusOfCell(byEpic('E10')?.api)).toBe(FEATURES.composeServer.status);
  });

  it('cites files that exist, and code or tests as proof of what it shows built', () => {
    for (const row of EPICS) {
      for (const ref of row.evidence) expect(repoPathExists(stripEvidenceRef(ref)), ref).toBe(true);
    }
    expect(hasBuiltProof(table.sources)).toBe(true);
  });
});

describe('deuda-seguridad', () => {
  const table = deudaSeguridadTable();

  // What each cited line says: when a document moves, the row must be re-read.
  const PINS: readonly (readonly [string, RegExp])[] = [
    [
      'docs/adr/0016-autorizacion-por-proyecto-y-sesion.md:102',
      /validador de sesión.*Sec-Fetch-Site/,
    ],
    ['docs/adr/0016-autorizacion-por-proyecto-y-sesion.md:85', /bloqueo de ingreso/],
    ['docs/adr/0016-autorizacion-por-proyecto-y-sesion.md:5', /no tiene flujos de CI/],
    ['docs/adr/0017-subida-de-imagenes-desde-el-navegador.md:97', /sobrescribe/],
    ['deploy/README.md:49', /Content-Security-Policy[\s\S]*TLS/],
    ['compose.yaml:11-12', /ports:[\s\S]*DB_PORT/],
    ['compose.yaml:36-39', /API_PORT/],
    ['compose.yaml:9', /POSTGRES_PASSWORD/],
    ['api/src/Pps.Infrastructure/Persistence/DatabaseInitializer.cs:28', /ADMIN_PASSWORD/],
    [
      'api/src/Pps.Infrastructure/Persistence/DatabaseInitializer.cs:50-53',
      /catch[\s\S]*LogWarning/,
    ],
    ['api/src/Pps.Infrastructure/Storage/PhysicalStorageService.cs:101', /FileMode\.Create/],
    ['contract/CHANGELOG.md:33', /Todavía no aplica/],
  ];

  async function citedText(ref: string): Promise<string> {
    const match = /^(.+?):(\d+)(?:-(\d+))?$/.exec(ref);
    const path = match?.[1] ?? ref;
    const lines = (await readRepoFile(path)).split('\n');
    if (!match?.[2]) return lines.join('\n');
    const from = Number(match[2]);
    const to = match[3] === undefined ? from : Number(match[3]);
    return lines.slice(from - 1, to).join('\n');
  }

  it('has the debt rows with a topic, a state and cited evidence', () => {
    expect(table.id).toBe('deuda-seguridad');
    expect(table.rows).toHaveLength(DEBT.length);
    expect(DEBT.length).toBeGreaterThanOrEqual(10);
    expect(table.columns.map((column) => column.label)).toEqual(['Tema', 'Estado', 'Evidencia']);
    for (const row of DEBT) expect(row.evidence.length, row.topic).toBeGreaterThan(0);
  });

  it('reads the state of the tripwire rows from FEATURES', () => {
    const state = (start: string) =>
      statusOfCell(DEBT.find((row) => row.topic.startsWith(start))?.state);
    expect(state('Sin validador de sesión')).toBe(FEATURES.sessionValidator.status);
    expect(state('Sin guarda contra CSRF')).toBe(FEATURES.csrfGuard.status);
    expect(state('Sin TLS')).toBe(FEATURES.tls.status);
    expect(state('Sin integración continua')).toBe(FEATURES.ci.status);
  });

  it('cites only files that exist, each cited line saying what the row claims', async () => {
    const cited = DEBT.flatMap((row) => row.evidence);
    for (const ref of cited) expect(repoPathExists(stripEvidenceRef(ref)), ref).toBe(true);
    for (const ref of cited.filter((candidate) => /:\d+/.test(candidate))) {
      expect(
        PINS.some(([pinned]) => pinned === ref),
        `${ref} cita una línea sin prueba`,
      ).toBe(true);
    }
    for (const [ref, pattern] of PINS) {
      expect(await citedText(ref), ref).toMatch(pattern);
    }
  });

  it('names gaps and never values: no password, port, host, key or address', () => {
    const strings = collectStrings(table, 'table');
    expect(findDenied(strings, LEAK_DENYLIST)).toEqual([]);
    expect(findDenied(strings, CLAIMS_DENYLIST, { showMatch: true })).toEqual([]);
  });
});

describe('the stop', () => {
  it('has the four tabs, a list of next steps that starts with the editor, and a sound shape', () => {
    expect(content.section.tabs.map((tab) => tab.label)).toEqual([
      'Plan frente a lo hecho',
      'Por épica',
      'Deuda y seguridad',
      'Próximos pasos',
    ]);
    const list = content.section.tabs[3]?.blocks[0];
    expect(list).toEqual({ kind: 'list', items: NEXT_STEPS });
    expect(NEXT_STEPS[0]?.startsWith(`${g('editor')} Editor de anotaciones`)).toBe(true);
    expect(checkSectionShape(content.section)).toEqual([]);
    expect(content.section.minutes).toBe(2);
  });

  it('shows the gantt first, and says the editor is the critical path', () => {
    expect(content.section.tabs[0]?.blocks[0]).toEqual({ kind: 'diagram', id: 'hoja-de-ruta' });
    expect(content.section.notes[0]).toBe(
      'La API llegó a I3 antes de lo previsto; el editor es el camino crítico.',
    );
  });

  it('never says aceptado, aprobado/aprobada, protegido/protegida, seguro/segura or leaks a value', () => {
    const strings = collectStrings(content, 'stop');
    expect(strings.length).toBeGreaterThan(50);
    expect(findDenied(strings, CLAIMS_DENYLIST, { showMatch: true })).toEqual([]);
    expect(findDenied(strings, LEAK_DENYLIST)).toEqual([]);
  });
});
