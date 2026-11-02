/** Diagram of the progress stop: `hoja-de-ruta`, the plan against what git says was done. */
import { SNAPSHOT } from '../../model/status';
import type { DiagramDef } from '../../model/types';

const DAY_MS = 86_400_000;

/** Monday of week 1 of the plan (`docs/BITACORA_PPS1.md:13`): the weeks of the roadmap count from here. */
export const PLAN_WEEK_1 = '2026-10-19';

/** Closing days of the two practices (`docs/arquitectura/01-introduccion-y-restricciones.md:68`). */
export const PPS2_CLOSES = '2026-12-03';
export const PPS1_CLOSES = '2026-12-16';

export function addDays(isoDate: string, days: number): string {
  return new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to`, both `YYYY-MM-DD`. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

export interface PlanBar {
  label: string;
  /** First day of the bar. */
  start: string;
  /** Length in days, the last day included. */
  days: number;
}

/** A bar over whole weeks of the plan, `fromWeek` to `toWeek` inclusive (week 1 starts 19/10). */
function weeks(label: string, fromWeek: number, toWeek: number): PlanBar {
  return {
    label,
    start: addDays(PLAN_WEEK_1, 7 * (fromWeek - 1)),
    days: 7 * (toWeek - fromWeek + 1),
  };
}

/** A bar from the start of `fromWeek` to a closing day, that day included. */
function weeksUntil(label: string, fromWeek: number, closes: string): PlanBar {
  const start = addDays(PLAN_WEEK_1, 7 * (fromWeek - 1));
  return { label, start, days: daysBetween(start, closes) + 1 };
}

/**
 * The roadmap v0.9 (`docs/arquitectura/06-organizacion-y-roadmap.md`, section 13): the order is
 * fixed and the weeks are indicative. I4 and I5 end on the closing days of the two practices.
 */
export const PLAN: readonly PlanBar[] = [
  weeks('I0 Base', 1, 1),
  weeks('I1 Esqueleto de punta a punta', 2, 3),
  weeks('I2 WSI, polígonos y conjuntos', 3, 4),
  weeks('I3 Edición, importación y exportación', 5, 6),
  weeksUntil('I4 Aceptación PPS 2 (cierra 03/12)', 7, PPS2_CLOSES),
  weeksUntil('I5 Cierre PPS 1 (cierra 16/12)', 7, PPS1_CLOSES),
];

function ganttLine({ label, start, days }: PlanBar, tags = ''): string {
  return `    ${label} :${tags}${start}, ${String(days)}d`;
}

/**
 * What was done, by the date of the commit that brought it to `main` (an upper bound: the work
 * is older). Checked with `git log 2584cfc`: the base, tiles and contract 0.1 and the first API
 * day are of 17/10, the API closed I3 on 28/10, the login and catalog of the web on 24/10 and the
 * scope change on 31/10 and 01/11.
 */
export const DONE: readonly { bar: PlanBar; tags: string }[] = [
  { bar: { label: 'Base, teselas y contrato 0.1', start: '2026-10-17', days: 1 }, tags: 'done, ' },
  { bar: { label: 'API hasta I3', start: '2026-10-17', days: 12 }, tags: 'done, ' },
  { bar: { label: 'Ingreso y catálogo web', start: '2026-10-24', days: 1 }, tags: 'active, ' },
  {
    bar: { label: 'Roles y subida (en main, sin aprobación)', start: '2026-10-31', days: 2 },
    tags: 'crit, active, ',
  },
];

/**
 * Mermaid draws `todayMarker` at the browser's current date and reads whatever follows the
 * keyword as a CSS style, so the date written after it is not what places the line. The cut of
 * the data is the milestone of the editor and the title of the figure.
 */
const source = [
  'gantt',
  '    dateFormat YYYY-MM-DD',
  '    axisFormat %d/%m',
  '    tickInterval 1week',
  '    weekday monday',
  `    todayMarker ${SNAPSHOT.date}`,
  '    section Plan (hoja de ruta v0.9)',
  ...PLAN.map((bar) => ganttLine(bar)),
  '    section Hecho (fecha de commit, cota superior)',
  ...DONE.map(({ bar, tags }) => ganttLine(bar, tags)),
  `    Editor en la SPA (sin empezar) :milestone, ${SNAPSHOT.date}, 0d`,
].join('\n');

export const hojaDeRuta: DiagramDef = {
  id: 'hoja-de-ruta',
  kind: 'gantt',
  title: `Plan frente a lo hecho (corte ${SNAPSHOT.label})`,
  summary:
    'Diagrama de Gantt: arriba el plan de la hoja de ruta v0.9, de I0 a I5, desde el 19/10/2026 hasta el cierre del 16/12/2026; abajo lo hecho según la fecha de commit. La API llegó al incremento I3 el 28/10, el ingreso y el catálogo de la web son del 24/10, los roles y la subida del 31/10 al 01/11 y el editor de la SPA figura sin empezar al 02/11/2026.',
  caption: 'La fecha de git es una cota superior del trabajo.',
  source,
  usesStatus: false,
  sources: [
    {
      kind: 'doc',
      ref: 'docs/arquitectura/06-organizacion-y-roadmap.md:106-117',
      note: 'Roadmap por incrementos, sección 13',
    },
    {
      kind: 'doc',
      ref: 'docs/BITACORA_PPS1.md:13-21',
      note: 'La semana 1 empieza el 19/10/2026; I4 cierra el 03/12',
    },
    {
      kind: 'doc',
      ref: 'docs/arquitectura/01-introduccion-y-restricciones.md:68',
      note: 'Períodos de la PPS 1 (hasta el 16/12) y de la PPS 2 (hasta el 03/12)',
    },
    {
      kind: 'git',
      ref: 'git:c206d18',
      note: 'Línea base de arquitectura y contrato 0.1, 17/10/2026',
    },
    { kind: 'git', ref: 'git:5dc62d9', note: 'La API cierra I3, 28/10/2026' },
    { kind: 'git', ref: 'git:194309b', note: 'Ingreso y catálogo de la web, 24/10/2026' },
    { kind: 'git', ref: 'git:97255fd', note: 'Contrato 0.2.0 del cambio de alcance, 31/10/2026' },
    { kind: 'git', ref: 'git:2584cfc', note: 'Último commit del cambio de alcance, 01/11/2026' },
  ],
  priority: 'P0',
};

export const diagrams: readonly DiagramDef[] = [hojaDeRuta];
