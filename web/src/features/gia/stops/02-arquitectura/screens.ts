/**
 * The screens of the SPA, as data. The `pantallas` table is built from this list and a drift
 * test checks it against the router (`parseRoute`), `App.tsx` and the OpenAPI contracts, so a
 * screen cannot be documented with an address or an operation that does not exist.
 */
import type { Route } from '../../../../shared/router';
import { FEATURES } from '../../model/features';
import type { Status } from '../../model/status';

export interface OperationRef {
  contract: 'api' | 'tiles';
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  /** Path as the OpenAPI file writes it, including the `/api/v1` prefix. */
  path: string;
}

export type ScreenKind =
  /** A screen of the product that exists today; counted by `FACTS.screens`. */
  | 'product'
  /** This guide: it exists, but it is not part of the product. */
  | 'guide'
  /** Proposed screen that is not built: its status comes from `FEATURES`. */
  | 'planned';

export interface ScreenDef {
  id: string;
  kind: ScreenKind;
  name: string;
  /** Address as documented. Placeholders are written `{id}`. */
  url: string;
  /** A concrete address that must resolve to `route` through `parseRoute`; null if none. */
  sample: string | null;
  /** `Route['name']` of the screen; null where it has no address of its own. */
  route: Route['name'] | null;
  audience: string;
  fallback: string;
  /** What the screen uses, in plain words. */
  api: string;
  /** The operations behind `api`, checked against the contract files. */
  ops: readonly OperationRef[];
  status: Status;
  statusText?: string;
}

const apiOp = (method: OperationRef['method'], path: string): OperationRef => ({
  contract: 'api',
  method,
  path: `/api/v1${path}`,
});

const PLANNED_FALLBACK = 'Sin definir: la pantalla no tiene diseño.';

export const SCREENS: readonly ScreenDef[] = [
  {
    id: 'login',
    kind: 'product',
    name: 'Ingreso',
    url: 'Cualquier dirección, sin sesión',
    sample: null,
    route: null,
    audience: 'Visitante sin sesión',
    fallback: 'Con sesión no se muestra. Al ingresar se abre la dirección que se había pedido.',
    api: 'Ingreso y consulta de la sesión',
    ops: [apiOp('POST', '/auth/login'), apiOp('GET', '/auth/me')],
    status: 'done',
  },
  {
    id: 'catalog',
    kind: 'product',
    name: 'Catálogo',
    url: '/',
    sample: '/',
    route: 'catalog',
    audience: 'Cualquier usuario con sesión',
    fallback: 'Una dirección desconocida muestra el catálogo sin cambiar la dirección.',
    api: 'Proyectos, datasets, imágenes, archivos del servidor y subida',
    ops: [
      apiOp('GET', '/projects'),
      apiOp('POST', '/projects'),
      apiOp('GET', '/projects/{projectId}/datasets'),
      apiOp('POST', '/projects/{projectId}/datasets'),
      apiOp('GET', '/datasets/{datasetId}/images'),
      apiOp('POST', '/datasets/{datasetId}/images'),
      apiOp('POST', '/datasets/{datasetId}/images/upload'),
      apiOp('GET', '/storage/files'),
    ],
    status: 'partial',
    statusText: 'Sin pantalla de clases',
  },
  {
    id: 'viewer',
    kind: 'product',
    name: 'Visor de imágenes',
    url: '/images/{id}',
    sample: '/images/1',
    route: 'viewer',
    audience: 'Cualquier usuario con sesión',
    fallback:
      'El acceso a la imagen lo decide la API al pedir las teselas. Sin acceso, el visor muestra «No se pudo abrir la imagen.»',
    api: 'Solo el servicio de teselas: descriptor Deep Zoom y teselas JPEG',
    ops: [
      { contract: 'tiles', method: 'GET', path: '/tiles/v1/images/{imageId}.dzi' },
      {
        contract: 'tiles',
        method: 'GET',
        path: '/tiles/v1/images/{imageId}_files/{level}/{col}_{row}.jpeg',
      },
    ],
    status: 'done',
  },
  {
    id: 'users',
    kind: 'product',
    name: 'Usuarios',
    url: '/admin/users',
    sample: '/admin/users',
    route: 'users',
    audience: 'Administración global',
    fallback: 'Otro rol vuelve al catálogo.',
    api: 'Listar y crear usuarios (editar y desactivar: solo por la API)',
    ops: [apiOp('GET', '/users'), apiOp('POST', '/users')],
    status: 'done',
  },
  {
    id: 'members',
    kind: 'product',
    name: 'Miembros del proyecto',
    url: '/projects/{id}/members',
    sample: '/projects/1/members',
    route: 'members',
    audience:
      'Quien conozca la dirección: la interfaz no la restringe, solo muestra el botón «Miembros» con permiso',
    fallback:
      'La API responde 404 (no es miembro) o 403 (rol menor al de administrador del proyecto) y la pantalla muestra una alerta.',
    api: 'Proyecto, miembros y usuarios: alta, cambio de rol y baja',
    ops: [
      apiOp('GET', '/projects/{projectId}'),
      apiOp('GET', '/projects/{projectId}/members'),
      apiOp('POST', '/projects/{projectId}/members'),
      apiOp('PATCH', '/projects/{projectId}/members/{userId}'),
      apiOp('DELETE', '/projects/{projectId}/members/{userId}'),
      apiOp('GET', '/users'),
    ],
    status: 'done',
  },
  {
    id: 'guide',
    kind: 'guide',
    name: 'Guía del sistema (esta página)',
    url: '/gia',
    sample: '/gia',
    route: 'gia',
    audience: 'Administración global',
    fallback:
      'Otro rol vuelve al catálogo. La restricción es de la interfaz, no del servidor: el contenido no es secreto.',
    api: 'Ninguna: es contenido del paquete de la interfaz',
    ops: [],
    status: 'done',
  },
  {
    id: 'editor',
    kind: 'planned',
    name: 'Editor de anotaciones (propuesta, sin diseño)',
    url: 'Sin definir',
    sample: null,
    route: null,
    audience: 'Anotador o superior, según el permiso de la API',
    fallback: PLANNED_FALLBACK,
    api: 'Clases (listar) y anotaciones (listar, crear, editar y borrar)',
    ops: [
      apiOp('GET', '/datasets/{datasetId}/classes'),
      apiOp('GET', '/images/{imageId}/annotations'),
      apiOp('POST', '/images/{imageId}/annotations'),
      apiOp('PATCH', '/annotations/{annotationId}'),
      apiOp('DELETE', '/annotations/{annotationId}'),
    ],
    status: FEATURES.editor.status,
  },
  {
    id: 'classes',
    kind: 'planned',
    name: 'Clases del dataset (propuesta, sin diseño)',
    url: 'Sin definir',
    sample: null,
    route: null,
    audience: 'Administrador del proyecto o superior, según el permiso de la API',
    fallback: PLANNED_FALLBACK,
    api: 'Clases (listar, crear, editar y borrar)',
    ops: [
      apiOp('GET', '/datasets/{datasetId}/classes'),
      apiOp('POST', '/datasets/{datasetId}/classes'),
      apiOp('PATCH', '/classes/{classId}'),
      apiOp('DELETE', '/classes/{classId}'),
    ],
    status: FEATURES.classesScreen.status,
  },
  {
    id: 'import',
    kind: 'planned',
    name: 'Importar anotaciones CRIC (propuesta, sin diseño)',
    url: 'Sin definir',
    sample: null,
    route: null,
    audience: 'Administración global, según el permiso de la API',
    fallback: PLANNED_FALLBACK,
    api: 'Importación del dataset, con simulación previa (dryRun)',
    ops: [apiOp('POST', '/datasets/{datasetId}/imports')],
    status: FEATURES.importScreen.status,
  },
  {
    id: 'export',
    kind: 'planned',
    name: 'Exportar el dataset (propuesta, sin diseño)',
    url: 'Sin definir',
    sample: null,
    route: null,
    audience: 'Administrador del proyecto o superior, según el permiso de la API',
    fallback: PLANNED_FALLBACK,
    api: 'Exportación del dataset (JSON interno y COCO)',
    ops: [apiOp('GET', '/datasets/{datasetId}/export')],
    status: FEATURES.exportScreen.status,
  },
];
