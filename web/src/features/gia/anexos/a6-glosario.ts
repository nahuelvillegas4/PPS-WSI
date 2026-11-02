import type { StopContent } from '../model/types';

// Stub from unit U0: the owner unit of this annex replaces the section and fills the tables.
export const content: StopContent = {
  section: {
    id: 'a6-glosario',
    group: 'anexo',
    title: 'Glosario',
    headline: 'Referencia: términos usados en esta página.',
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
