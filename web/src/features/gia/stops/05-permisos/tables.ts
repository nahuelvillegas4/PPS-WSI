import {
  can,
  PROJECT_ROLE_LABELS,
  type AccessContext,
  type ProjectAction,
} from '../../../access/access';
import { GLOBAL_ROLE_LABELS } from '../../../users/globalRoleLabels';
import {
  CALLERS,
  MINIMUM_LABELS,
  MINIMUM_ORDER,
  OPERATIONS,
  pendingStatus,
  reachByRole,
  type Caller,
} from '../../data/operations';
import type { Cell, ColumnDef, ApiArea, ApiOperation, TableDef } from '../../model/types';
import { matrixRows, type Outcome } from './matrix';

const FIXTURE = 'contract/fixtures/authorization-matrix.json';
const OPENAPI = 'contract/openapi/api.v1.yaml';

// matriz-permisos ---------------------------------------------------------------------------

/** One column per caller; the keys are the row keys of the table. */
export const CALLER_COLUMNS: Readonly<Record<Caller, ColumnDef>> = {
  anonymous: { key: 'anonimo', label: 'Anónimo', align: 'center' },
  'non-member': { key: 'sinMembresia', label: 'Sin membresía', align: 'center' },
  viewer: { key: 'lector', label: PROJECT_ROLE_LABELS.viewer, align: 'center' },
  annotator: { key: 'anotador', label: PROJECT_ROLE_LABELS.annotator, align: 'center' },
  'project-admin': { key: 'adminProyecto', label: 'Admin del proyecto', align: 'center' },
  'global-admin': { key: 'adminGlobal', label: 'Admin global', align: 'center' },
};

function outcomeCell(outcome: Outcome): Cell {
  if (outcome === 'yes') return { yes: true };
  if (outcome === 'own') return { yes: 'own' };
  return { mono: String(outcome) };
}

function matrixTable(): TableDef {
  const reach = reachByRole();
  const rows = matrixRows().map((row) => {
    const cells: Record<string, Cell> = {
      requisito: `${row.group.label} (${row.operations})`,
    };
    for (const caller of CALLERS) {
      cells[CALLER_COLUMNS[caller].key] = outcomeCell(row.outcomes[caller]);
    }
    return cells;
  });
  const footer: Record<string, Cell> = {
    requisito: 'Alcance acumulado: operaciones que cada rol puede llamar',
  };
  for (const caller of CALLERS) footer[CALLER_COLUMNS[caller].key] = reach[caller];

  return {
    id: 'matriz-permisos',
    title: 'Quién puede qué',
    caption:
      'Cada fila agrupa las operaciones que piden lo mismo y entre paréntesis cuántas son. Un número es la respuesta HTTP que recibe quien no puede. En editar o borrar una anotación hace falta, además del rol, ser su autor: ni la administración global puede hacerlo por otro. La consulta de acceso de la pasarela se cuenta en project.view y no se muestra con su ruta; a un no miembro le responde 403 (nota 2).',
    columns: [
      { key: 'requisito', label: 'Requisito de acceso (operaciones)' },
      ...CALLERS.map((caller) => CALLER_COLUMNS[caller]),
    ],
    rows,
    footer,
    sources: [
      { kind: 'contract', ref: FIXTURE },
      { kind: 'code', ref: 'api/src/Pps.Domain/Access/Permission.cs:20-29' },
      { kind: 'code', ref: 'api/src/Pps.Domain/Access/AccessPolicy.cs:28-49' },
      { kind: 'test', ref: 'api/tests/Pps.Domain.Tests/AuthorizationMatrixTests.cs' },
    ],
  };
}

// roles -------------------------------------------------------------------------------------

const ROLES_TABLE: TableDef = {
  id: 'roles',
  title: 'Los dos niveles de rol',
  caption:
    'El rol global está en la cuenta; el rol de proyecto está en la membresía. La administración global actúa como administrador de todo proyecto sin ser miembro.',
  columns: [
    { key: 'nivel', label: 'Nivel' },
    { key: 'rol', label: 'Rol' },
    { key: 'alcance', label: 'Alcance' },
    { key: 'asigna', label: 'Quién lo asigna' },
    { key: 'etiqueta', label: 'Etiqueta en la interfaz' },
  ],
  rows: [
    {
      nivel: 'Global',
      rol: { mono: 'admin' },
      alcance:
        'Todo el sistema: usuarios, proyectos y volumen de imágenes, y administrador de todo proyecto existente.',
      asigna:
        'La administración global, al crear o editar la cuenta. No se asigna como miembro de un proyecto.',
      etiqueta: GLOBAL_ROLE_LABELS.admin,
    },
    {
      nivel: 'Global',
      rol: { mono: 'user' },
      alcance: 'Solo los proyectos en los que es miembro; en los demás recibe 404.',
      asigna: 'La administración global, al crear o editar la cuenta.',
      etiqueta: GLOBAL_ROLE_LABELS.user,
    },
    {
      nivel: 'Proyecto',
      rol: { mono: 'viewer' },
      alcance:
        'Ver el proyecto, sus datasets, clases, imágenes, anotaciones de todos los autores y teselas.',
      asigna:
        'El administrador del proyecto o la administración global, desde la pantalla de miembros.',
      etiqueta: PROJECT_ROLE_LABELS.viewer,
    },
    {
      nivel: 'Proyecto',
      rol: { mono: 'annotator' },
      alcance: 'Lo del lector, más crear anotaciones y editar o borrar las propias.',
      asigna:
        'El administrador del proyecto o la administración global, desde la pantalla de miembros.',
      etiqueta: PROJECT_ROLE_LABELS.annotator,
    },
    {
      nivel: 'Proyecto',
      rol: { mono: 'project-admin' },
      alcance:
        'Lo del anotador, más administrar datasets y clases, subir imágenes, gestionar miembros y exportar.',
      asigna:
        'El administrador del proyecto o la administración global, desde la pantalla de miembros.',
      etiqueta: PROJECT_ROLE_LABELS['project-admin'],
    },
  ],
  sources: [
    { kind: 'code', ref: 'api/src/Pps.Domain/Access/GlobalRoles.cs' },
    { kind: 'code', ref: 'api/src/Pps.Domain/Access/ProjectRole.cs' },
    { kind: 'code', ref: 'api/src/Pps.Api/Controllers/Members/ProjectMembersController.cs' },
    { kind: 'code', ref: 'web/src/features/access/access.ts' },
    { kind: 'code', ref: 'web/src/features/users/globalRoleLabels.ts' },
    { kind: 'adr', ref: 'docs/adr/0015-roles-por-proyecto-y-membresia.md' },
  ],
};

// que-ve-cada-rol ---------------------------------------------------------------------------

/** The six project actions the interface asks `can()` about, in the order the page shows them. */
export const ACTION_LABELS: Readonly<Record<ProjectAction, string>> = {
  viewProject: 'Ver el proyecto, sus datasets, imágenes y anotaciones',
  annotate: 'Crear anotaciones (editar o borrar: solo su autor)',
  manageCatalog: 'Administrar el catálogo: datasets y clases',
  uploadImages: 'Subir imágenes desde el navegador',
  manageMembers: 'Gestionar los miembros del proyecto',
  exportDataset: 'Exportar las anotaciones del dataset',
};

export const ACTION_ORDER: readonly ProjectAction[] = [
  'viewProject',
  'annotate',
  'manageCatalog',
  'uploadImages',
  'manageMembers',
  'exportDataset',
];

interface RoleColumn {
  key: string;
  label: string;
  align: 'center';
  context: AccessContext;
}

/** The five sessions compared, as the context the interface builds for each of them. */
export const ROLE_COLUMNS: readonly RoleColumn[] = [
  {
    key: 'sinMembresia',
    label: 'Sin membresía',
    align: 'center',
    context: { globalRole: 'user', projectRole: null },
  },
  {
    key: 'lector',
    label: PROJECT_ROLE_LABELS.viewer,
    align: 'center',
    context: { globalRole: 'user', projectRole: 'viewer' },
  },
  {
    key: 'anotador',
    label: PROJECT_ROLE_LABELS.annotator,
    align: 'center',
    context: { globalRole: 'user', projectRole: 'annotator' },
  },
  {
    key: 'adminProyecto',
    label: 'Admin del proyecto',
    align: 'center',
    context: { globalRole: 'user', projectRole: 'project-admin' },
  },
  {
    key: 'adminGlobal',
    label: 'Admin global',
    align: 'center',
    context: { globalRole: 'admin', projectRole: null },
  },
];

function visibilityTable(): TableDef {
  const emptyFooter: Record<string, Cell> = {
    accion: 'Solo oculta controles: la API decide en cada pedido.',
  };
  for (const column of ROLE_COLUMNS) emptyFooter[column.key] = '';
  return {
    id: 'que-ve-cada-rol',
    title: 'Qué muestra la interfaz a cada rol',
    caption:
      'La tabla se calcula llamando a can(), la función que la interfaz usa para mostrar u ocultar controles.',
    columns: [
      { key: 'accion', label: 'Acción' },
      ...ROLE_COLUMNS.map(({ key, label, align }) => ({ key, label, align })),
    ],
    rows: ACTION_ORDER.map((action) => {
      const row: Record<string, Cell> = { accion: ACTION_LABELS[action] };
      for (const column of ROLE_COLUMNS) {
        row[column.key] = { yes: can(action, column.context) };
      }
      return row;
    }),
    footer: emptyFooter,
    sources: [
      { kind: 'code', ref: 'web/src/features/access/access.ts' },
      { kind: 'test', ref: 'web/src/features/access/access.test.ts' },
      { kind: 'contract', ref: FIXTURE },
    ],
  };
}

// api-areas ---------------------------------------------------------------------------------

export const AREA_LABELS: Readonly<Record<ApiArea, string>> = {
  auth: 'Sesión: ingresar, salir y ver la sesión',
  users: 'Usuarios',
  projects: 'Proyectos',
  members: 'Miembros de un proyecto',
  datasets: 'Datasets',
  classes: 'Clases',
  images: 'Archivos del volumen e imágenes',
  annotations: 'Anotaciones',
  io: 'Importar y exportar',
  internal: 'Consulta de acceso de la pasarela',
  health: 'Estado del servicio',
};

/** Areas in the order of the table. */
export const AREA_ORDER: readonly ApiArea[] = [
  'auth',
  'users',
  'projects',
  'members',
  'datasets',
  'classes',
  'images',
  'annotations',
  'io',
  'internal',
  'health',
];

const PENDING_CHIP: Readonly<Record<'planned' | 'partial', (count: number) => string>> = {
  planned: (count) => (count === 1 ? '1 planificado' : `${count} planificados`),
  partial: (count) => (count === 1 ? '1 parcial' : `${count} parciales`),
};

function pendingCell(operations: readonly ApiOperation[]): Cell {
  const chips: { label: string; status: 'planned' | 'partial' }[] = [];
  for (const status of ['planned', 'partial'] as const) {
    const count = operations.filter((operation) => pendingStatus(operation) === status).length;
    if (count > 0) chips.push({ label: PENDING_CHIP[status](count), status });
  }
  return chips.length > 0 ? { chips } : '—';
}

function minimumCell(operations: readonly ApiOperation[]): string {
  return MINIMUM_ORDER.filter((minimum) =>
    operations.some((operation) => operation.minimum === minimum),
  )
    .map((minimum) => MINIMUM_LABELS[minimum])
    .join(' · ');
}

function apiAreasTable(): TableDef {
  const withScreen = (operations: readonly ApiOperation[]): number =>
    operations.filter((operation) => operation.inSpa).length;
  return {
    id: 'api-areas',
    title: 'La API por áreas',
    caption:
      'Con pantalla: la interfaz de hoy llama a la operación. Pendiente: lo que la operación todavía debe al contrato o a un ADR; el detalle está en el anexo de la API.',
    columns: [
      { key: 'area', label: 'Área' },
      { key: 'operaciones', label: 'Operaciones', align: 'right' },
      { key: 'pantalla', label: 'Con pantalla', align: 'right' },
      { key: 'minimo', label: 'Mínimo' },
      { key: 'pendiente', label: 'Pendiente' },
    ],
    rows: AREA_ORDER.map((area) => {
      const operations = OPERATIONS.filter((operation) => operation.area === area);
      return {
        area: AREA_LABELS[area],
        operaciones: operations.length,
        pantalla: `${withScreen(operations)} de ${operations.length}`,
        minimo: minimumCell(operations),
        pendiente: pendingCell(operations),
      };
    }),
    footer: {
      area: 'Total',
      operaciones: OPERATIONS.length,
      pantalla: `${withScreen(OPERATIONS)} de ${OPERATIONS.length}`,
      minimo: '',
      pendiente: pendingCell(OPERATIONS),
    },
    sources: [
      { kind: 'contract', ref: FIXTURE },
      { kind: 'contract', ref: OPENAPI },
      { kind: 'code', ref: 'web/src/features/catalog/catalogApi.ts' },
      { kind: 'code', ref: 'web/src/features/members/membersApi.ts' },
    ],
  };
}

export const TABLES_PERMISOS: readonly TableDef[] = [
  matrixTable(),
  ROLES_TABLE,
  visibilityTable(),
  apiAreasTable(),
];
