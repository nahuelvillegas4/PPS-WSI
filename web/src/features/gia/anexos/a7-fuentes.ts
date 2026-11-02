import type { StopContent } from '../model/types';

// Stub from unit U0: the owner unit of this annex replaces the section and fills the tables.
export const content: StopContent = {
  section: {
    id: 'a7-fuentes',
    group: 'anexo',
    title: 'Fuentes y método',
    headline: 'Cómo se obtuvo cada dato de esta página y qué no se verificó.',
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
