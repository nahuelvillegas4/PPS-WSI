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

/**
 * Annex A2: one row per requirement of the two statements. Only the state column is filterable
 * (status chips); a single PPS is found with the text search, by typing "P1-" or "P2-".
 */
export const requisitosTable: TableDef = {
  id: 'requisitos',
  title: 'Requisitos de las dos PPS',
  caption: `Estado verificado contra el código al ${SNAPSHOT.label} (commit ${SNAPSHOT.commit}). Los ${String(REQUIREMENTS.length)} requisitos son el desglose que hizo el equipo de los enunciados, que no los numeran así. Planificado: solo existe en los documentos. Sin empezar: no hay código ni plan operativo. Una pantalla de gestión que falta cuenta contra la PPS 1, que entrega el flujo en el navegador; la PPS 2 se mide por su módulo, la API; el editor cuenta contra las dos. El botón «Planificado» incluye lo sin empezar. Para una sola PPS, buscar «P1-» o «P2-».`,
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
