import type { StopContent } from '../model/types';

// Stub from unit U0: the owner unit of this annex replaces the section and fills the tables.
export const content: StopContent = {
  section: {
    id: 'a3-calidad',
    group: 'anexo',
    title: 'Calidad y riesgos',
    headline: 'Referencia: escenarios de calidad y riesgos con su estado observable.',
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
