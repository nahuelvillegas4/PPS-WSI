import { OPERATIONS } from '../../data/operations';
import { FACTS } from '../../model/facts';
import type { StopContent } from '../../model/types';
import { DIAGRAMS_PERMISOS } from './diagrams';
import { TABLES_PERMISOS } from './tables';

/** Permission keys the operations ask for; six today, counted from the rows. */
const PERMISSION_COUNT = new Set(
  OPERATIONS.flatMap((operation) => (operation.permission === null ? [] : [operation.permission])),
).size;

const WITH_PENDING = OPERATIONS.filter((operation) => operation.pending !== undefined).length;

/** Stop 5: two levels of role, who may call what, and what the interface only hides. */
export const content: StopContent = {
  section: {
    id: 'permisos',
    group: 'recorrido',
    title: 'Roles y permisos',
    headline: 'Dos niveles de rol; el servidor decide siempre y la interfaz solo oculta.',
    minutes: 2.5,
    tabs: [
      {
        id: 'matriz',
        label: 'Matriz',
        blocks: [{ kind: 'table', id: 'matriz-permisos' }],
      },
      {
        id: 'roles',
        label: 'Roles y decisión',
        blocks: [
          { kind: 'diagram', id: 'roles' },
          { kind: 'diagram', id: 'decision-acceso' },
          { kind: 'table', id: 'roles' },
        ],
      },
      {
        id: 'interfaz',
        label: 'En la interfaz',
        blocks: [
          {
            kind: 'callout',
            tone: 'info',
            title: 'La interfaz solo oculta',
            text: 'Esta tabla muestra qué controles ve cada rol en la interfaz. La restricción es de interfaz: el servidor vuelve a decidir en cada pedido, aunque alguien llegue a la dirección o llame a la API directamente.',
          },
          { kind: 'table', id: 'que-ve-cada-rol' },
        ],
      },
      {
        id: 'api',
        label: 'La API en números',
        blocks: [
          {
            kind: 'stats',
            items: [
              { value: String(FACTS.operations), label: 'operaciones de la API' },
              { value: String(FACTS.inSpa), label: 'las llama la interfaz hoy' },
              { value: String(PERMISSION_COUNT), label: 'permisos de proyecto' },
              {
                value: String(WITH_PENDING),
                label: 'con diferencias o pendientes frente al contrato',
                status: 'partial',
              },
              {
                value: String(FACTS.tileOperations),
                label: 'operaciones del servicio de teselas, con su propio contrato',
              },
            ],
          },
          { kind: 'table', id: 'api-areas' },
        ],
      },
    ],
    notes: [
      'El servidor decide; la interfaz solo oculta.',
      `La matriz tiene ${FACTS.operations} operaciones y ${PERMISSION_COUNT} permisos de proyecto; la interfaz llama a ${FACTS.inSpa}.`,
      'Quien no es miembro recibe 404, igual que si el recurso no existiera: no se revela qué proyectos hay.',
      'Brecha conocida: el rol global viaja en la cookie y no se revalida; el validador de sesión del ADR-16 está propuesto.',
    ],
    footnotes: [
      {
        id: '1',
        text: 'El rol global viaja en la cookie desde el ingreso (8 h deslizantes) y no se revalida; /auth/me lee el rol actual de la base. Tras un PATCH /users la interfaz y la API pueden discrepar hasta reingresar. Los roles de proyecto no se ven afectados. PLANIFICADO: SessionValidator (ADR-16).',
      },
      {
        id: '2',
        text: 'tile-access: un no miembro recibe 403, no 404, porque auth_request de Nginx solo acepta 2xx, 401 y 403.',
      },
    ],
  },
  diagrams: DIAGRAMS_PERMISOS,
  tables: TABLES_PERMISOS,
};
