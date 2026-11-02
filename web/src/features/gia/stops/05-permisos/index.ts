import type { StopContent } from '../../model/types';

// Stub from unit U0: the owner unit of this stop replaces the section and fills diagrams/tables.
export const content: StopContent = {
  section: {
    id: 'permisos',
    group: 'recorrido',
    title: 'Roles y permisos',
    headline: 'Dos niveles de rol; el servidor decide siempre y la interfaz solo oculta.',
    minutes: 2.5,
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
