import type { StopContent } from '../model/types';

// Stub from unit U0: the owner unit of this annex replaces the section and fills the tables.
export const content: StopContent = {
  section: {
    id: 'a2-requisitos',
    group: 'anexo',
    title: 'Requisitos, uno por uno',
    headline: 'Referencia: cada requisito de las dos PPS con su estado y su evidencia.',
    tabs: [
      {
        id: 'resumen',
        label: 'Resumen',
        blocks: [{ kind: 'callout', tone: 'info', text: 'Contenido en construcción.' }],
      },
    ],
    notes: ['Contenido en construcción.', 'Contenido en construcción.'],
  },
  diagrams: [],
  tables: [],
};
