import type { StopContent } from '../../model/types';

// Stub from unit U0: the owner unit of this stop replaces the section and fills diagrams/tables.
export const content: StopContent = {
  section: {
    id: 'decisiones',
    group: 'recorrido',
    title: 'Decisiones',
    headline: '17 decisiones de arquitectura, y un cambio de alcance que espera aprobación.',
    minutes: 2,
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
