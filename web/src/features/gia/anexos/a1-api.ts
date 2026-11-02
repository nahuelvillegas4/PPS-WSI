import {
  CONTRACT_VERSION,
  GLOBAL_ADMIN_OPERATIONS,
  INTERNAL_PATH,
  MINIMUM_LABELS,
  OPERATIONS,
  operationLabel,
} from '../data/operations';
import { FACTS } from '../model/facts';
import type { ApiOperation, Cell, ScopeKind, StopContent, TableDef } from '../model/types';

/** Annex A1: the operations of the API, generated from `OPERATIONS` (see `data/operations.ts`). */

const SCOPE_LABELS: Readonly<Record<ScopeKind, string>> = {
  none: '—',
  project: 'proyecto',
  dataset: 'dataset',
  class: 'clase',
  image: 'imagen',
  annotation: 'anotación',
};

function marks(operation: ApiOperation): string {
  const found: string[] = [];
  if (operation.ownerOnly) found.push('solo autor');
  if (operation.manualGate) found.push('permiso aplicado a mano');
  return found.length > 0 ? found.join(' · ') : '—';
}

function api40(): TableDef {
  const withScreen = OPERATIONS.filter((operation) => operation.inSpa).length;
  return {
    id: 'api-40',
    title: `Las ${FACTS.operations} operaciones de la API`,
    caption:
      'Una fila por operación del contrato, en el orden del contrato. Pantalla: la interfaz de hoy llama a la operación. Pendiente: lo que todavía debe al contrato o a un ADR.',
    columns: [
      { key: 'n', label: '#', align: 'right' },
      { key: 'ruta', label: 'Método y ruta' },
      { key: 'minimo', label: 'Mínimo' },
      { key: 'permiso', label: 'Permiso' },
      { key: 'ambito', label: 'Ámbito' },
      { key: 'noMiembro', label: 'No miembro', align: 'center' },
      { key: 'marcas', label: 'Marcas' },
      { key: 'pantalla', label: 'Pantalla', align: 'center' },
      { key: 'pendiente', label: 'Pendiente' },
    ],
    rows: OPERATIONS.map((operation, index): Record<string, Cell> => ({
      n: index + 1,
      ruta:
        operation.path === INTERNAL_PATH
          ? operationLabel(operation)
          : { mono: operationLabel(operation) },
      minimo: MINIMUM_LABELS[operation.minimum],
      permiso: operation.permission === null ? '—' : { mono: operation.permission },
      ambito: SCOPE_LABELS[operation.scope],
      noMiembro: operation.nonMember === null ? '—' : { mono: String(operation.nonMember) },
      marcas: marks(operation),
      pantalla: { yes: operation.inSpa },
      pendiente: operation.pending ?? '—',
    })),
    footer: {
      n: '',
      ruta: `${OPERATIONS.length} operaciones`,
      minimo: '',
      permiso: '',
      ambito: '',
      noMiembro: '',
      marcas: '',
      pantalla: `${withScreen} de ${OPERATIONS.length}`,
      pendiente: '',
    },
    sources: [
      { kind: 'contract', ref: 'contract/fixtures/authorization-matrix.json' },
      { kind: 'contract', ref: 'contract/openapi/api.v1.yaml' },
      { kind: 'code', ref: 'web/src/features/auth/authApi.ts' },
      { kind: 'code', ref: 'web/src/features/catalog/catalogApi.ts' },
      { kind: 'code', ref: 'web/src/features/members/membersApi.ts' },
      { kind: 'code', ref: 'web/src/features/users/usersApi.ts' },
      { kind: 'code', ref: 'web/src/features/upload/uploadApi.ts' },
    ],
  };
}

export const content: StopContent = {
  section: {
    id: 'a1-api',
    group: 'anexo',
    title: 'API: las operaciones',
    headline:
      'Referencia: las operaciones de la API con su permiso mínimo y si la interfaz las usa.',
    tabs: [
      {
        id: 'operaciones',
        label: 'Las operaciones',
        blocks: [
          {
            kind: 'callout',
            tone: 'info',
            title: 'Cómo leer la tabla',
            text: `Fuente única: la matriz de autorización del contrato, versión ${CONTRACT_VERSION}. Mínimo es el rol más bajo que puede llamar a la operación. Ámbito es el recurso del que se deduce el proyecto. No miembro es la respuesta que recibe quien no tiene rol en el proyecto. Marcas: solo autor significa que, además del rol, hay que ser quien creó la anotación; permiso aplicado a mano, que el controlador consulta el permiso por su cuenta (listar proyectos y la consulta de acceso de la pasarela). Las ${String(GLOBAL_ADMIN_OPERATIONS)} operaciones que piden administración global las decide el rol que viaja en la cookie, sin consultar la política de proyecto.`,
          },
          { kind: 'table', id: 'api-40' },
        ],
      },
    ],
    notes: [
      'Referencia: cada operación de la API con su permiso mínimo y si la interfaz la usa.',
      `Son ${FACTS.operations} operaciones; la interfaz usa ${FACTS.inSpa} y el resto solo existe en la API.`,
      'No es parte del recorrido: se abre solo si la supervisión pregunta por una operación puntual.',
    ],
  },
  diagrams: [],
  tables: [api40()],
};
