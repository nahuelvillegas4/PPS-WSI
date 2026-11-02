import type { StopContent } from '../../model/types';

// Stub from unit U0: the owner unit of this stop replaces the section and fills diagrams/tables.
export const content: StopContent = {
  section: {
    id: 'preguntas',
    group: 'recorrido',
    title: 'Preguntas',
    headline: 'Cinco decisiones que necesitamos de la supervisión.',
    minutes: 1,
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
