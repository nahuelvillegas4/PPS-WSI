import type { StopContent } from '../model/types';

// Stub from unit U0: the owner unit of this annex replaces the section and fills the tables.
export const content: StopContent = {
  section: {
    id: 'a4-metricas',
    group: 'anexo',
    title: 'Métricas medidas',
    headline: 'Referencia: números medidos, con fecha, método y límites.',
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
