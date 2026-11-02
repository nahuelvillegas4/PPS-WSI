import type { StopContent } from '../model/types';
import { requisitosTable } from '../stops/06-requisitos/requirementsTable';

/** Annex A2: the table behind the waffle of stop 6, one row per requirement. */
export const content: StopContent = {
  section: {
    id: 'a2-requisitos',
    group: 'anexo',
    title: 'Requisitos, uno por uno',
    headline: 'Referencia: cada requisito de las dos PPS con su estado y su evidencia.',
    tabs: [
      {
        id: 'tabla',
        label: 'Tabla',
        blocks: [{ kind: 'table', id: requisitosTable.id }],
      },
    ],
    notes: [
      'Cada requisito de las dos PPS con su estado y la evidencia en el repositorio.',
      'Filtrar por PPS o por estado para ver solo lo que falta.',
    ],
  },
  diagrams: [],
  tables: [requisitosTable],
};
