import type { StopContent } from '../../model/types';

// Stub from unit U0: the owner unit of this stop replaces the section and fills diagrams/tables.
export const content: StopContent = {
  section: {
    id: 'calidad',
    group: 'recorrido',
    title: 'Calidad',
    headline: 'Qué se probó, cómo y qué no cubren las pruebas.',
    minutes: 1.5,
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
