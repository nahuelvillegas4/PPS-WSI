import { REQUIREMENTS } from '../../data/requirements';
import { SNAPSHOT, toStatus } from '../../model/status';
import type { Cell, Requirement, TableDef } from '../../model/types';
import { REQ_STATE_LABEL, pendingCount, stateCounts } from './derive';

/** The state chip keeps "sin empezar" apart from "planificado" even though both draw as planned. */
function stateCell(row: Requirement): Cell {
  return { status: toStatus(row.state), text: REQ_STATE_LABEL[row.state] };
}

function totalsCell(rows: readonly Requirement[]): Cell {
  const counts = stateCounts(rows);
  return {
    chips: [
      { label: `${counts.implemented} implementados`, status: 'done' },
      { label: `${counts.partial} parciales`, status: 'partial' },
      { label: `${pendingCount(counts)} pendientes`, status: 'planned' },
    ],
  };
}

/** Annex A2: one row per requirement of the two statements, filterable by PPS and by state. */
export const requisitosTable: TableDef = {
  id: 'requisitos',
  title: 'Requisitos de las dos PPS',
  caption: `Estado verificado contra el código al ${SNAPSHOT.label} (commit ${SNAPSHOT.commit}). Planificado: solo existe en los documentos. Sin empezar: no hay código ni plan operativo.`,
  columns: [
    { key: 'id', label: 'ID' },
    { key: 'pps', label: 'PPS', align: 'center' },
    { key: 'text', label: 'Requisito' },
    { key: 'state', label: 'Estado', filterable: true },
    { key: 'evidence', label: 'Evidencia' },
  ],
  rows: REQUIREMENTS.map((row) => ({
    id: row.id,
    pps: row.pps,
    text: row.text,
    state: stateCell(row),
    evidence: { mono: row.evidence },
  })),
  footer: {
    id: 'Total',
    text: `${REQUIREMENTS.length} requisitos`,
    state: totalsCell(REQUIREMENTS),
  },
  sources: [
    {
      kind: 'doc',
      ref: 'docs/PPS_01_Plataforma_Anotacion_Imagenes_Medicas.pdf',
      note: 'Enunciado de la PPS 1',
    },
    {
      kind: 'doc',
      ref: 'docs/PPS_02_Gestion_Anotacion_Datasets (1).pdf',
      note: 'Enunciado de la PPS 2',
    },
    {
      kind: 'run',
      ref: `run:${SNAPSHOT.date} contraste de cada requisito con el código sobre el commit ${SNAPSHOT.commit}`,
    },
  ],
};
