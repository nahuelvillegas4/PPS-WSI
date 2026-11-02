/**
 * Stop 10, "Estado final": how the system should look when it is finished. Everything here is a
 * proposal the supervision has not confirmed: the diagrams mark what exists and what does not, and
 * the wireframes say they are sketches without an interface specification behind them.
 */
import type { Block, Section, StopContent } from '../../model/types';
import { diagrams } from './diagrams';
import { tables } from './tables';

const WIREFRAMES: readonly Block[] = [
  { kind: 'wireframe', id: 'editor' },
  { kind: 'wireframe', id: 'import' },
  { kind: 'wireframe', id: 'export' },
  { kind: 'wireframe', id: 'classes' },
];

const section: Section = {
  id: 'final',
  group: 'recorrido',
  title: 'Estado final',
  headline: 'Así debería quedar al terminar: editor en la web, tres pantallas más y servidor.',
  minutes: 2,
  tabs: [
    {
      id: 'despliegue',
      label: 'Despliegue final',
      blocks: [
        { kind: 'diagram', id: 'estado-final' },
        {
          kind: 'callout',
          tone: 'honest',
          title: 'Sin decidir',
          text: 'El servidor del laboratorio (S2) y el acceso externo con TLS (S3) siguen sin respuesta. Todo lo punteado de la franja de operación es una propuesta: no existe en el repositorio.',
        },
      ],
    },
    {
      id: 'pantallas',
      label: 'Pantallas',
      blocks: [
        { kind: 'diagram', id: 'mapa-pantallas' },
        { kind: 'table', id: 'pantallas' },
        ...WIREFRAMES,
      ],
    },
    {
      id: 'aceptacion',
      label: 'Aceptación',
      blocks: [
        { kind: 'diagram', id: 'aceptacion' },
        { kind: 'table', id: 'aceptacion' },
      ],
    },
  ],
  notes: [
    'Así termina; lo que falta lo decide la supervisión.',
    'Los bocetos son propuestas: no hay una especificación de interfaz y queremos su opinión.',
    'Mostrar el despliegue final, el mapa de pantallas con el boceto del editor y los criterios de aceptación.',
  ],
};

export const content: StopContent = { section, diagrams, tables };
