import type { StopContent } from '../../model/types';

// Stub from unit U0: the owner unit of this stop replaces the section and fills diagrams/tables.
export const content: StopContent = {
  section: {
    id: 'que-es',
    group: 'recorrido',
    title: 'Qué es GIA',
    headline:
      'GIA es un visor y anotador web de imágenes médicas gigantes, con permisos por proyecto.',
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
