/**
 * Pure derivations from the requirement rows: counts, the headline, the waffle, the bars and the
 * "gaps by theme" cards. Nothing here is typed by hand; every number is counted from the rows.
 */
import { FEATURES, type FeatureId } from '../../model/features';
import { statusOf } from '../../model/diagramKit';
import { toStatus, type ReqState, type Status } from '../../model/status';
import type { Block, GapTheme, Requirement, StatusLabels } from '../../model/types';

export interface StateCounts {
  implemented: number;
  partial: number;
  planned: number;
  notStarted: number;
}

export const REQ_STATE_LABEL: Record<ReqState, string> = {
  implemented: 'Implementado',
  partial: 'Parcial',
  planned: 'Planificado',
  'not-started': 'Sin empezar',
};

/** Order in which the squares of the waffle are laid out: what is built first. */
const STATE_ORDER: readonly ReqState[] = ['implemented', 'partial', 'planned', 'not-started'];

export function stateCounts(rows: readonly Requirement[]): StateCounts {
  const counts: StateCounts = { implemented: 0, partial: 0, planned: 0, notStarted: 0 };
  for (const row of rows) {
    if (row.state === 'implemented') counts.implemented += 1;
    else if (row.state === 'partial') counts.partial += 1;
    else if (row.state === 'planned') counts.planned += 1;
    else counts.notStarted += 1;
  }
  return counts;
}

/** Requirements that are planned or not started: the "pendientes" of the headline. */
export function pendingCount(counts: StateCounts): number {
  return counts.planned + counts.notStarted;
}

export function ofPps(rows: readonly Requirement[], pps: 1 | 2): Requirement[] {
  return rows.filter((row) => row.pps === pps);
}

/**
 * Headline of stop 6, at most 90 characters, computed from the rows. The rows are the team's own
 * breakdown of the two statements, which do not number 79 requirements, and the headline says so.
 */
export function buildHeadline(rows: readonly Requirement[]): string {
  const counts = stateCounts(rows);
  return (
    `De ${rows.length} requisitos (desglose propio): ${counts.implemented} cumplidos, ` +
    `${counts.partial} parciales y ${pendingCount(counts)} pendientes.`
  );
}

/**
 * The waffle and the bars draw planned and not started requirements with the same square, so
 * their captions call that status "pendiente" instead of "planificado": only one requirement is
 * truly planned. The tooltips and the table of annex A2 keep the two states apart.
 */
export const PENDING_LABELS: StatusLabels = {
  planned: { singular: 'pendiente', plural: 'pendientes' },
};

/** "1 pendiente", "3 pendientes". */
function counted(n: number, singular: string, plural: string): string {
  return `${String(n)} ${n === 1 ? singular : plural}`;
}

/** One square per requirement, by PPS, ordered built first so the waffle reads as a fill level. */
export function buildWaffle(rows: readonly Requirement[]): Block {
  const group = (pps: 1 | 2) => {
    const own = ofPps(rows, pps);
    const ordered = STATE_ORDER.flatMap((state) => own.filter((row) => row.state === state));
    return {
      label: `PPS ${pps}`,
      cells: ordered.map((row) => ({
        status: toStatus(row.state),
        title: `${row.id} · ${REQ_STATE_LABEL[row.state]} · ${row.text}`,
      })),
    };
  };
  return { kind: 'waffle', groups: [group(1), group(2)], statusLabels: PENDING_LABELS };
}

/** Segments of one bar: built, partial and pending (planned plus not started); empty ones are dropped. */
function segmentsOf(rows: readonly Requirement[]): { status: Status; value: number }[] {
  const counts = stateCounts(rows);
  const segments: { status: Status; value: number }[] = [
    { status: 'done', value: counts.implemented },
    { status: 'partial', value: counts.partial },
    { status: 'planned', value: pendingCount(counts) },
  ];
  return segments.filter((segment) => segment.value > 0);
}

export function buildBars(rows: readonly Requirement[]): Block {
  return {
    kind: 'bars',
    rows: [
      { label: 'PPS 1', segments: segmentsOf(ofPps(rows, 1)) },
      { label: 'PPS 2', segments: segmentsOf(ofPps(rows, 2)) },
      { label: 'Ambas PPS', segments: segmentsOf(rows) },
    ],
    statusLabels: PENDING_LABELS,
  };
}

// Gaps by theme -------------------------------------------------------------------------------

export const THEME_ORDER: readonly GapTheme[] = [
  'editor',
  'pantallas',
  'servidor',
  'ci-calidad',
  'informe',
  'datos-de-prueba',
  'alcance',
  'documentacion',
];

export const THEME_TITLE: Record<GapTheme, string> = {
  editor: 'Editor de anotaciones',
  pantallas: 'Pantallas de gestión',
  servidor: 'Servidor del laboratorio',
  'ci-calidad': 'Repositorio, CI y responsables',
  informe: 'Informe final y backlog',
  'datos-de-prueba': 'Datos de prueba',
  alcance: 'Alcance y aprobación',
  documentacion: 'Documentación de uso',
};

/** Labels of the tripwire items that are still not built, lower-cased to read inside a sentence. */
function missing(ids: readonly FeatureId[]): string {
  return ids
    .filter((id) => statusOf(id) !== 'done')
    .map((id) => FEATURES[id].label.toLowerCase())
    .join(', ');
}

/**
 * One sentence per theme about what is missing. Parts that a tripwire guards are read from
 * `FEATURES`, so the sentence cannot go on saying "falta" about something that now exists.
 */
export const THEME_NOTE: Record<GapTheme, string> = {
  editor: FEATURES.editor.gap,
  pantallas: `La API ya tiene las operaciones; faltan: ${missing(['classesScreen', 'importScreen', 'exportScreen'])}.`,
  servidor: `El servidor del laboratorio no tiene fecha ni acceso confirmados; faltan: ${missing(['composeServer', 'smoke', 'backup'])}.`,
  'ci-calidad': `Repositorio institucional y herramientas por definir; faltan: ${missing(['ci', 'codeowners'])}.`,
  informe: 'Ninguna de las dos prácticas tiene todavía el informe final ni el backlog priorizado.',
  'datos-de-prueba':
    'Falta fijar el subconjunto de CRIC o CCEDD, la WSI de prueba y la licencia de ambos.',
  alcance:
    'El cambio de alcance (roles por proyecto y subida de imágenes) no tiene aprobación registrada ni contrapartida de esfuerzo acordada.',
  documentacion:
    'Faltan el manual de instalación y uso, la guía de importación y exportación y el comando de pruebas de la API; varios README describen un estado anterior.',
};

export interface ThemeSummary {
  theme: GapTheme;
  rows: Requirement[];
  partial: number;
  pending: number;
}

/** Open requirements grouped by theme, largest group first (ties keep the theme order). */
export function summarizeThemes(rows: readonly Requirement[]): ThemeSummary[] {
  const summaries: ThemeSummary[] = [];
  for (const theme of THEME_ORDER) {
    const own = rows.filter((row) => row.state !== 'implemented' && row.theme === theme);
    if (own.length === 0) continue;
    const counts = stateCounts(own);
    summaries.push({ theme, rows: own, partial: counts.partial, pending: pendingCount(counts) });
  }
  return summaries.sort((a, b) => b.rows.length - a.rows.length);
}

/**
 * A theme with something built in part shows as partial. When everything open is pending it shows
 * as planned only if some requirement is planned; if all of them are not started, nothing is
 * built or planned there and the card carries no state at all.
 */
function themeStatus(summary: ThemeSummary): Status | undefined {
  if (summary.partial > 0) return 'partial';
  return summary.rows.some((row) => row.state === 'planned') ? 'planned' : undefined;
}

export function buildGapCards(rows: readonly Requirement[]): Block {
  return {
    kind: 'cards',
    items: summarizeThemes(rows).map((summary) => ({
      title: THEME_TITLE[summary.theme],
      body: `${counted(summary.rows.length, 'requisito abierto', 'requisitos abiertos')} (${counted(summary.partial, 'parcial', 'parciales')}, ${counted(summary.pending, 'pendiente', 'pendientes')}). ${THEME_NOTE[summary.theme]}`,
      status: themeStatus(summary),
      chips: summary.rows.map((row) => row.id),
    })),
  };
}
