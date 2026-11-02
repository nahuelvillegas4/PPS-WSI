import { PROJECT_ROLE_LABELS } from '../../access/access';
import { GLOBAL_ROLE_LABELS } from '../../users/globalRoleLabels';
import { STATUS_META, type Status } from '../model/status';
import type { ApiArea, ApiOperation, Minimum, PermissionKey, ScopeKind } from '../model/types';

/**
 * The 40 operations of `contract/fixtures/authorization-matrix.json`, one row each. Owner: U4.
 *
 * The first block mirrors the fixture column by column (a test compares them); the second says
 * which of them the SPA calls today and what the API still owes the contract. Nothing here is
 * counted by hand: totals come from the rows.
 */

/** Version of the contract the rows mirror; a test compares it with the fixture and the OpenAPI. */
export const CONTRACT_VERSION = '0.2.0';

/** Stand-in for the route of the gateway's access check, which the page never shows. */
export const INTERNAL_PATH = '(interna)';

/** `[id, method, path, area, minimum, permission, scope, nonMember, mark]`; `id` is the operationId. */
type FixtureRow = readonly [
  id: string,
  method: string,
  path: string,
  area: ApiArea,
  minimum: Minimum,
  permission: PermissionKey | null,
  scope: ScopeKind,
  nonMember: 403 | 404 | null,
  mark?: 'owner' | 'manual',
];

// prettier-ignore
const FIXTURE_ROWS: readonly FixtureRow[] = [
  ['login',                'POST',   '/api/v1/auth/login',                                 'auth',        'anonymous',         null,               'none',       null],
  ['logout',               'POST',   '/api/v1/auth/logout',                                'auth',        'any-authenticated', null,               'none',       null],
  ['getCurrentUser',       'GET',    '/api/v1/auth/me',                                    'auth',        'any-authenticated', null,               'none',       null],
  ['listUsers',            'GET',    '/api/v1/users',                                      'users',       'global-admin',      null,               'none',       null],
  ['createUser',           'POST',   '/api/v1/users',                                      'users',       'global-admin',      null,               'none',       null],
  ['getUser',              'GET',    '/api/v1/users/{userId}',                             'users',       'global-admin',      null,               'none',       null],
  ['updateUser',           'PATCH',  '/api/v1/users/{userId}',                             'users',       'global-admin',      null,               'none',       null],
  ['listProjects',         'GET',    '/api/v1/projects',                                   'projects',    'any-authenticated', null,               'none',       null, 'manual'],
  ['createProject',        'POST',   '/api/v1/projects',                                   'projects',    'global-admin',      null,               'none',       null],
  ['getProject',           'GET',    '/api/v1/projects/{projectId}',                       'projects',    'viewer',            'project.view',     'project',    404],
  ['updateProject',        'PATCH',  '/api/v1/projects/{projectId}',                       'projects',    'global-admin',      null,               'project',    403],
  ['deleteProject',        'DELETE', '/api/v1/projects/{projectId}',                       'projects',    'global-admin',      null,               'project',    403],
  ['listProjectMembers',   'GET',    '/api/v1/projects/{projectId}/members',               'members',     'project-admin',     'member.manage',    'project',    404],
  ['addProjectMember',     'POST',   '/api/v1/projects/{projectId}/members',               'members',     'project-admin',     'member.manage',    'project',    404],
  ['updateProjectMember',  'PATCH',  '/api/v1/projects/{projectId}/members/{userId}',      'members',     'project-admin',     'member.manage',    'project',    404],
  ['removeProjectMember',  'DELETE', '/api/v1/projects/{projectId}/members/{userId}',      'members',     'project-admin',     'member.manage',    'project',    404],
  ['listDatasets',         'GET',    '/api/v1/projects/{projectId}/datasets',              'datasets',    'viewer',            'project.view',     'project',    404],
  ['createDataset',        'POST',   '/api/v1/projects/{projectId}/datasets',              'datasets',    'project-admin',     'catalog.manage',   'project',    404],
  ['getDataset',           'GET',    '/api/v1/datasets/{datasetId}',                       'datasets',    'viewer',            'project.view',     'dataset',    404],
  ['updateDataset',        'PATCH',  '/api/v1/datasets/{datasetId}',                       'datasets',    'project-admin',     'catalog.manage',   'dataset',    404],
  ['deleteDataset',        'DELETE', '/api/v1/datasets/{datasetId}',                       'datasets',    'project-admin',     'catalog.manage',   'dataset',    404],
  ['listClasses',          'GET',    '/api/v1/datasets/{datasetId}/classes',               'classes',     'viewer',            'project.view',     'dataset',    404],
  ['createClass',          'POST',   '/api/v1/datasets/{datasetId}/classes',               'classes',     'project-admin',     'catalog.manage',   'dataset',    404],
  ['updateClass',          'PATCH',  '/api/v1/classes/{classId}',                          'classes',     'project-admin',     'catalog.manage',   'class',      404],
  ['deleteClass',          'DELETE', '/api/v1/classes/{classId}',                          'classes',     'project-admin',     'catalog.manage',   'class',      404],
  ['listStorageFiles',     'GET',    '/api/v1/storage/files',                              'images',      'global-admin',      null,               'none',       null],
  ['listImages',           'GET',    '/api/v1/datasets/{datasetId}/images',                'images',      'viewer',            'project.view',     'dataset',    404],
  ['registerImages',       'POST',   '/api/v1/datasets/{datasetId}/images',                'images',      'global-admin',      null,               'dataset',    403],
  ['uploadImages',         'POST',   '/api/v1/datasets/{datasetId}/images/upload',         'images',      'project-admin',     'image.upload',     'dataset',    404],
  ['getImage',             'GET',    '/api/v1/images/{imageId}',                           'images',      'viewer',            'project.view',     'image',      404],
  ['listAnnotations',      'GET',    '/api/v1/images/{imageId}/annotations',               'annotations', 'viewer',            'project.view',     'image',      404],
  ['createAnnotation',     'POST',   '/api/v1/images/{imageId}/annotations',               'annotations', 'annotator',         'annotation.write', 'image',      404],
  ['getAnnotation',        'GET',    '/api/v1/annotations/{annotationId}',                 'annotations', 'viewer',            'project.view',     'annotation', 404],
  ['updateAnnotation',     'PATCH',  '/api/v1/annotations/{annotationId}',                 'annotations', 'annotator',         'annotation.write', 'annotation', 404, 'owner'],
  ['deleteAnnotation',     'DELETE', '/api/v1/annotations/{annotationId}',                 'annotations', 'annotator',         'annotation.write', 'annotation', 404, 'owner'],
  ['importAnnotations',    'POST',   '/api/v1/datasets/{datasetId}/imports',               'io',          'global-admin',      null,               'dataset',    403],
  ['exportDataset',        'GET',    '/api/v1/datasets/{datasetId}/export',                'io',          'project-admin',     'dataset.export',   'dataset',    404],
  ['authorizeTileRequest', 'GET',    INTERNAL_PATH,                                        'internal',    'viewer',            'project.view',     'image',      403, 'manual'],
  ['apiLive',              'GET',    '/health/live',                                       'health',      'anonymous',         null,               'none',       null],
  ['apiReady',             'GET',    '/health/ready',                                      'health',      'anonymous',         null,               'none',       null],
];

/**
 * Operations the SPA calls today, by operationId. A test reads the `*Api.ts` files of the SPA and
 * compares them with this list, so it cannot drift when a screen starts using another operation.
 */
const CALLED_BY_SPA: ReadonlySet<string> = new Set([
  'login',
  'logout',
  'getCurrentUser',
  'listUsers',
  'createUser',
  'listProjects',
  'createProject',
  'getProject',
  'listProjectMembers',
  'addProjectMember',
  'updateProjectMember',
  'removeProjectMember',
  'listDatasets',
  'createDataset',
  'listStorageFiles',
  'listImages',
  'registerImages',
  'uploadImages',
]);

interface PendingNote {
  status: Extract<Status, 'planned' | 'partial'>;
  detail: string;
}

/**
 * What an operation still owes the contract or an ADR, verified against the API source on
 * 02/11/2026 (see `odd/gia-mapas/map-api.md` sections 4, 6 and 8). Anything not listed behaves as
 * documented.
 */
const PENDING: Readonly<Record<string, PendingNote>> = {
  logout: {
    status: 'planned',
    detail:
      'borrar la caché del navegador al cerrar sesión con Clear-Site-Data (ADR-16, propuesto).',
  },
  updateUser: {
    status: 'planned',
    detail:
      '409 protected-user y baja de las membresías al promover a administrador (contrato 0.2.0).',
  },
  addProjectMember: {
    status: 'planned',
    detail: '429 ante búsquedas fallidas repetidas de nombres de usuario (contrato 0.2.0).',
  },
  uploadImages: {
    status: 'planned',
    detail:
      '413, 507, 409 storage-key-in-use y escritura sin sobrescribir (ADR-17, propuesto); hoy un archivo huérfano con la misma clave se sobrescribe y, si se corta la copia de un archivo, puede quedar uno parcial en el volumen.',
  },
  importAnnotations: {
    status: 'partial',
    detail:
      'un archivo CRIC malformado responde 500 en lugar de 400, y una inspección fallida se omite con aviso en lugar del 503 del contrato.',
  },
  exportDataset: {
    status: 'planned',
    detail:
      'format=yolo responde 422 unsupported-format; el ADR-10 lo deja condicional, solo si sobra tiempo.',
  },
  authorizeTileRequest: {
    status: 'planned',
    detail:
      'medir QS-4 (ADR-16, propuesto) y, solo si no se cumple, agregar una caché de 5 s; hoy cada tesela hace una consulta a la base.',
  },
  apiReady: {
    status: 'partial',
    detail:
      'solo comprueba la conexión a la base; no verifica las migraciones y devuelve el mensaje de error en el 503.',
  },
};

function pendingText(note: PendingNote): string {
  return `${STATUS_META[note.status].label.toUpperCase()}: ${note.detail}`;
}

function toOperation(row: FixtureRow): ApiOperation {
  const [id, method, path, area, minimum, permission, scope, nonMember, mark] = row;
  const note = PENDING[id];
  return {
    id,
    method,
    path,
    area,
    minimum,
    permission,
    scope,
    nonMember,
    ...(mark === 'owner' ? { ownerOnly: true as const } : {}),
    ...(mark === 'manual' ? { manualGate: true as const } : {}),
    inSpa: CALLED_BY_SPA.has(id),
    ...(note ? { pending: pendingText(note) } : {}),
  };
}

export const OPERATIONS: readonly ApiOperation[] = FIXTURE_ROWS.map(toOperation);

/**
 * Operations the access filter decides with `AccessPolicy.Decide` through `[RequirePermission]`:
 * those with a project permission, except the gateway's access check, which calls the policy by
 * hand. A test counts the attributes of the controllers and compares.
 */
export const PROJECT_PERMISSION_OPERATIONS = OPERATIONS.filter(
  (operation) => operation.permission !== null && operation.manualGate !== true,
).length;

/** Operations reserved to the global admin: the framework decides them from the role in the cookie. */
export const GLOBAL_ADMIN_OPERATIONS = OPERATIONS.filter(
  (operation) => operation.minimum === 'global-admin',
).length;

/** `planned` or `partial` when the operation owes something, `null` when it behaves as documented. */
export function pendingStatus(
  operation: ApiOperation,
): Extract<Status, 'planned' | 'partial'> | null {
  return PENDING[operation.id]?.status ?? null;
}

/** `GET /api/v1/projects`; the gateway's access check shows no route, only what it is. */
export function operationLabel(operation: ApiOperation): string {
  if (operation.path === INTERNAL_PATH) {
    return `${operation.method} (interna: consulta de acceso de la pasarela)`;
  }
  return `${operation.method} ${operation.path}`;
}

// Who may call what ------------------------------------------------------------------------

/** From the least to the most capable caller; each one includes the operations of the previous. */
export const MINIMUM_ORDER: readonly Minimum[] = [
  'anonymous',
  'any-authenticated',
  'viewer',
  'annotator',
  'project-admin',
  'global-admin',
];

export const MINIMUM_RANK: Readonly<Record<Minimum, number>> = {
  anonymous: 0,
  'any-authenticated': 1,
  viewer: 2,
  annotator: 3,
  'project-admin': 4,
  'global-admin': 5,
};

/** Labels shown for a minimum: the role names are the ones the interface itself uses. */
export const MINIMUM_LABELS: Readonly<Record<Minimum, string>> = {
  anonymous: 'Sin sesión',
  'any-authenticated': 'Cualquier sesión',
  viewer: PROJECT_ROLE_LABELS.viewer,
  annotator: PROJECT_ROLE_LABELS.annotator,
  'project-admin': PROJECT_ROLE_LABELS['project-admin'],
  'global-admin': GLOBAL_ROLE_LABELS.admin,
};

/** The six callers of the matrix. `non-member` is a signed-in user with no role in the project. */
export type Caller =
  'anonymous' | 'non-member' | 'viewer' | 'annotator' | 'project-admin' | 'global-admin';

export const CALLERS: readonly Caller[] = [
  'anonymous',
  'non-member',
  'viewer',
  'annotator',
  'project-admin',
  'global-admin',
];

/** The highest minimum each caller satisfies. */
export const CALLER_REACH: Readonly<Record<Caller, Minimum>> = {
  anonymous: 'anonymous',
  'non-member': 'any-authenticated',
  viewer: 'viewer',
  annotator: 'annotator',
  'project-admin': 'project-admin',
  'global-admin': 'global-admin',
};

/**
 * Operations each caller can reach, cumulative: a caller reaches every operation whose minimum is
 * at or below its own. Editing or deleting an annotation also needs to be its author, which this
 * count does not model.
 */
export function reachByRole(
  operations: readonly ApiOperation[] = OPERATIONS,
): Record<Caller, number> {
  const count = (caller: Caller): number => {
    const rank = MINIMUM_RANK[CALLER_REACH[caller]];
    return operations.filter((operation) => MINIMUM_RANK[operation.minimum] <= rank).length;
  };
  return {
    anonymous: count('anonymous'),
    'non-member': count('non-member'),
    viewer: count('viewer'),
    annotator: count('annotator'),
    'project-admin': count('project-admin'),
    'global-admin': count('global-admin'),
  };
}
