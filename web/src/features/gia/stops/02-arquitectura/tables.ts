/** Tables of the architecture stop: `contenedores` and `pantallas`. */
import { countBy, type Status } from '../../model/status';
import type { Cell, TableDef } from '../../model/types';
import { COMPOSE_SERVICES } from './diagrams';
import { SCREENS } from './screens';

export interface ContainerDef {
  /** Service name in `compose.yaml`; never rendered. */
  service: (typeof COMPOSE_SERVICES)[number];
  name: string;
  tech: string;
  role: string;
  owner: string;
  /** True when `compose.yaml` publishes a port of the service to the host. */
  published: boolean;
  publishedText: string;
  publishedStatus?: Status;
}

export const CONTAINERS: readonly ContainerDef[] = [
  {
    service: 'gateway',
    name: 'Pasarela',
    tech: 'Nginx 1.30.5 y la SPA compilada',
    role: 'Único punto de entrada: sirve la SPA, reenvía /api/ y /tiles/ y consulta a la API si cada tesela puede servirse',
    owner: 'PPS 1 (despliegue compartido)',
    published: true,
    publishedText: 'Sí: es la entrada del sistema',
    publishedStatus: 'done',
  },
  {
    service: 'api',
    name: 'API',
    tech: 'ASP.NET Core 10',
    role: 'Ingreso, catálogo, anotaciones, importación, exportación y consulta de acceso de las teselas',
    owner: 'PPS 2',
    published: true,
    publishedText: 'Sí, en todas las interfaces; plan: retirarlo o limitarlo al equipo local',
    publishedStatus: 'partial',
  },
  {
    service: 'tiles',
    name: 'Teselas',
    tech: 'FastAPI y OpenSlide sobre Python 3.13',
    role: 'Genera el descriptor Deep Zoom y las teselas JPEG; inspecciona los archivos al registrarlos',
    owner: 'PPS 1',
    published: false,
    publishedText: 'No: solo la red interna lo alcanza',
  },
  {
    service: 'db',
    name: 'Base de datos',
    tech: 'PostgreSQL 18',
    role: 'Persistencia de usuarios, proyectos, imágenes y anotaciones; solo la API la usa',
    owner: 'PPS 2',
    published: true,
    publishedText: 'Sí, en todas las interfaces; plan: retirarlo o limitarlo al equipo local',
    publishedStatus: 'partial',
  },
];

const contenedores: TableDef = {
  id: 'contenedores',
  title: 'Contenedores',
  caption:
    'Los cuatro servicios de Compose. Los puertos no se muestran. No existe un compose del servidor: el compose.yaml publica la API y la base de datos en todas las interfaces del equipo. El plan documentado es dejar solo la pasarela (arquitectura, Figura 7) o limitarlas al equipo local (ADR-16, propuesto).',
  columns: [
    { key: 'name', label: 'Servicio' },
    { key: 'tech', label: 'Tecnología' },
    { key: 'role', label: 'Rol' },
    { key: 'owner', label: 'Módulo' },
    { key: 'published', label: 'Publicado hoy en el equipo' },
    { key: 'status', label: 'Estado', align: 'center' },
  ],
  rows: CONTAINERS.map((container): Record<string, Cell> => ({
    name: container.name,
    tech: container.tech,
    role: container.role,
    owner: container.owner,
    published: container.publishedStatus
      ? { status: container.publishedStatus, text: container.publishedText }
      : container.publishedText,
    status: { status: 'done' },
  })),
  sources: [
    { kind: 'config', ref: 'compose.yaml' },
    { kind: 'config', ref: 'deploy/gateway/Dockerfile:13', note: 'imagen de la pasarela' },
    { kind: 'config', ref: 'api/Dockerfile:20', note: 'imagen de la API' },
    { kind: 'config', ref: 'tiles/Dockerfile:3', note: 'imagen del servicio de teselas' },
    { kind: 'doc', ref: 'docs/arquitectura/03-bloques-y-ejecucion.md:5-31' },
    { kind: 'doc', ref: 'docs/arquitectura/04-despliegue-y-conceptos.md:5-40', note: 'Figura 7' },
    { kind: 'adr', ref: 'docs/adr/0016-autorizacion-por-proyecto-y-sesion.md' },
  ],
};

const screenCounts = countBy(SCREENS, (screen) => screen.kind);

const pantallas: TableDef = {
  id: 'pantallas',
  title: 'Pantallas de la SPA',
  caption:
    'Las construidas salen del router y de App.tsx; las planificadas son propuestas y figuran con las operaciones del contrato que usarían.',
  columns: [
    { key: 'url', label: 'URL' },
    { key: 'screen', label: 'Pantalla' },
    { key: 'audience', label: 'Quién la ve' },
    { key: 'fallback', label: 'Si no corresponde' },
    { key: 'api', label: 'API que usa' },
    { key: 'status', label: 'Estado', align: 'center' },
  ],
  rows: SCREENS.map((screen): Record<string, Cell> => ({
    url: screen.sample === null ? screen.url : { mono: screen.url },
    screen: screen.name,
    audience: screen.audience,
    fallback: screen.fallback,
    api: screen.api,
    status:
      screen.statusText === undefined
        ? { status: screen.status }
        : { status: screen.status, text: screen.statusText },
  })),
  footer: {
    screen: `${screenCounts.product ?? 0} construidas, ${screenCounts.guide ?? 0} guía y ${screenCounts.planned ?? 0} planificadas`,
  },
  sources: [
    { kind: 'code', ref: 'web/src/shared/router.ts:23-38', note: 'parseRoute' },
    { kind: 'code', ref: 'web/src/app/App.tsx:39-84', note: 'una pantalla por cada ruta' },
    { kind: 'contract', ref: 'contract/openapi/api.v1.yaml' },
    { kind: 'contract', ref: 'contract/openapi/tiles.v1.yaml' },
  ],
};

export const tables: readonly TableDef[] = [contenedores, pantallas];
