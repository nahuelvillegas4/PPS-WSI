/**
 * Diagrams of the architecture stop: containers, context, the API inside and the SPA inside.
 * Status glyphs and classes come from `g()` / `c()`; tripwire items read `FEATURES`.
 */
import { GLOBAL_ADMIN_OPERATIONS, PROJECT_PERMISSION_OPERATIONS } from '../../data/operations';
import { c, g } from '../../model/diagramKit';
import { FACTS } from '../../model/facts';
import type { DiagramDef } from '../../model/types';

/**
 * Compose services drawn by the containers diagram and listed by the `contenedores` table.
 * A drift test keeps this list equal to the services of `compose.yaml`.
 */
export const COMPOSE_SERVICES = ['db', 'api', 'tiles', 'gateway'] as const;

const contenedores: DiagramDef = {
  id: 'contenedores',
  kind: 'flowchart',
  title: 'Contenedores',
  summary:
    `Cuatro contenedores dentro de Docker Compose. El navegador entra por la pasarela, que ` +
    `sirve la interfaz y reenvía los pedidos a la API y al servicio de teselas, consultando antes ` +
    `a la API si cada tesela puede servirse. La API usa la base de datos, pide al servicio de ` +
    `teselas que inspeccione cada imagen al registrarla y lee y escribe en la carpeta de ` +
    `imágenes; el servicio de teselas la lee en modo solo lectura. Dos líneas punteadas muestran ` +
    `que hoy el compose.yaml publica también la API y la base de datos en todas las interfaces ` +
    `del equipo, porque no existe un compose del servidor. El plan documentado es dejar solo la ` +
    `pasarela o limitar esas publicaciones al equipo local.`,
  caption:
    'Línea punteada: lo que publica hoy el compose.yaml además de la pasarela; el plan documentado es dejar solo la pasarela o limitarlo al equipo local.',
  source: `flowchart LR
  nav["Navegador"]
  host["Equipo o red local"]
  subgraph compose["Docker Compose: ${COMPOSE_SERVICES.length} contenedores"]
    gw["${g('done')} Pasarela<br/>Nginx + SPA · PPS 1"]${c('done')}
    api["${g('done')} API<br/>ASP.NET Core 10 · PPS 2"]${c('done')}
    tiles["${g('done')} Teselas<br/>FastAPI + OpenSlide · PPS 1"]${c('done')}
    db[("${g('done')} Base de datos<br/>PostgreSQL 18 · PPS 2")]${c('done')}
  end
  imgs[("${g('done')} Imágenes<br/>carpeta del laboratorio")]${c('done')}
  vols[("${g('done')} Volúmenes<br/>datos de la base y claves")]${c('done')}
  nav -->|"punto de entrada"| gw
  gw -->|"/api/ y consulta de acceso"| api
  gw -->|"/tiles/ tras autorizar"| tiles
  api --> db
  api -->|"inspeccionar al registrar"| tiles
  api ---|"lectura y escritura"| imgs
  tiles ---|"solo lectura"| imgs
  db --- vols
  api --- vols
  host -.->|"${g('partial')} publicado hoy<br/>por compose.yaml"| api
  host -.->|"${g('partial')} publicado hoy<br/>por compose.yaml"| db`,
  usesStatus: true,
  sources: [
    { kind: 'config', ref: 'compose.yaml', note: 'servicios, volúmenes y publicación de puertos' },
    { kind: 'config', ref: 'deploy/gateway/nginx.conf:13-48', note: 'rutas de la pasarela' },
    {
      kind: 'doc',
      ref: 'docs/arquitectura/03-bloques-y-ejecucion.md:5-31',
      note: 'contenedores (C4, nivel 2)',
    },
    { kind: 'adr', ref: 'docs/adr/0011-un-compose-dos-entornos.md' },
    {
      kind: 'doc',
      ref: 'docs/arquitectura/04-despliegue-y-conceptos.md:5-40',
      note: 'despliegue previsto (Figura 7)',
    },
    {
      kind: 'adr',
      ref: 'docs/adr/0016-autorizacion-por-proyecto-y-sesion.md',
      note: 'propone limitar las publicaciones al equipo local',
    },
  ],
  priority: 'P0',
};

const contexto: DiagramDef = {
  id: 'contexto',
  kind: 'flowchart',
  title: 'Contexto',
  summary:
    `GIA en su entorno. La administración global gestiona usuarios y proyectos e importa; los ` +
    `miembros de un proyecto ven las imágenes según su rol y anotar falta hasta que exista el ` +
    `editor. GIA lee la carpeta de imágenes del laboratorio, importa archivos CRIC solo por la ` +
    `API y exporta JSON interno y COCO; la exportación YOLO no existe y el ADR-10 la deja ` +
    `condicionada a que sobre tiempo. El servidor del laboratorio donde correrá todo todavía ` +
    `no está definido.`,
  source: `flowchart LR
  adm(["Administración global"])
  mem(["Miembro de proyecto<br/>lector, anotador o admin del proyecto"])
  gia["${g('partial')} GIA"]${c('partial')}
  store[("${g('done')} Carpeta de imágenes<br/>del laboratorio")]${c('done')}
  cric["${g('partial')} Archivos CRIC"]${c('partial')}
  json["${g('done')} JSON interno"]${c('done')}
  coco["${g('done')} COCO"]${c('done')}
  yolo["${g('yolo')} YOLO<br/>condicional, ADR-10"]${c('yolo')}
  srv["${g('unknown')} Servidor del laboratorio<br/>o VM equivalente"]${c('unknown')}
  adm -->|"gestiona usuarios y proyectos, importa"| gia
  mem -->|"ve según su rol<br/>anotar: falta el editor"| gia
  gia -->|"lee imágenes y guarda subidas"| store
  cric -->|"importa, solo por la API"| gia
  gia -->|"exporta, solo por la API"| json
  gia --> coco
  gia -.-> yolo
  srv -.->|"aloja todo"| gia`,
  usesStatus: true,
  sources: [
    {
      kind: 'doc',
      ref: 'docs/arquitectura/02-contexto-y-estrategia.md:5-24',
      note: 'contexto del sistema (C4, nivel 1)',
    },
    { kind: 'code', ref: 'api/src/Pps.Api/Controllers/IO/ExportController.cs:47-52', note: 'yolo' },
    { kind: 'adr', ref: 'docs/adr/0009-importacion-por-adaptadores.md' },
    { kind: 'adr', ref: 'docs/adr/0010-exportacion.md' },
  ],
  priority: 'P1',
};

const apiInterna: DiagramDef = {
  id: 'api-interna',
  kind: 'flowchart',
  title: 'La API por dentro',
  summary:
    `Dentro de la API, los ${FACTS.controllers} controladores con sus ${FACTS.operations} ` +
    `operaciones pasan por un único filtro de acceso que falla cerrado. Para las ` +
    `${PROJECT_PERMISSION_OPERATIONS} operaciones con permiso de proyecto, el filtro consulta ` +
    `una función pura, AccessPolicy.Decide, con los datos de pertenencia que lee de la base. ` +
    `Las ${GLOBAL_ADMIN_OPERATIONS} de administración global las decide el rol de la cookie; ` +
    `el listado de proyectos y la consulta de acceso de las teselas aplican la regla por su ` +
    `cuenta. Los controladores usan además el validador de geometrías con control de versión ` +
    `de las anotaciones, el importador CRIC, los exportadores, el servicio de almacenamiento y ` +
    `el inspector de imágenes. Dos piezas propuestas, el validador de sesión y la guarda ` +
    `contra pedidos de otros sitios, todavía no existen.`,
  source: `flowchart TB
  ctl["${g('done')} Controladores: ${FACTS.controllers}<br/>${FACTS.operations} operaciones"]${c('done')}
  guard["${g('done')} AccessGuardFilter<br/>falla cerrado"]${c('done')}
  policy["${g('done')} AccessPolicy.Decide<br/>función pura"]${c('done')}
  reader["${g('done')} EfProjectAccessReader<br/>una consulta por pedido"]${c('done')}
  db[("${g('done')} Base de datos")]${c('done')}
  geom["${g('done')} Anotaciones<br/>GeometryValidator, ETag, If-Match"]${c('done')}
  cric["${g('done')} CricImporter"]${c('done')}
  exp["${g('done')} Exportadores<br/>JSON interno y COCO"]${c('done')}
  storage["${g('done')} PhysicalStorageService<br/>archivos del volumen"]${c('done')}
  inspector["${g('done')} TilesImageInspector<br/>consulta al servicio de teselas"]${c('done')}
  sess["${g('sessionValidator')} SessionValidator<br/>propuesto, ADR-16"]${c('sessionValidator')}
  csrf["${g('csrfGuard')} FetchMetadataGuard<br/>propuesto, ADR-16"]${c('csrfGuard')}
  ctl --> guard
  guard -->|"decide: ${PROJECT_PERMISSION_OPERATIONS} con permiso<br/>de proyecto"| policy
  guard --> reader
  reader --> db
  ctl --> geom
  ctl --> cric
  ctl --> exp
  ctl --> storage
  ctl --> inspector
  sess -.-> guard
  csrf -.-> guard`,
  usesStatus: true,
  sources: [
    { kind: 'code', ref: 'api/src/Pps.Domain/Access/AccessPolicy.cs:28-49', note: 'Decide' },
    {
      kind: 'code',
      ref: 'api/src/Pps.Api/Common/Access/AccessGuardFilter.cs:35-57',
      note: 'exige exactamente una declaración de acceso',
    },
    { kind: 'code', ref: 'api/src/Pps.Infrastructure/Access/EfProjectAccessReader.cs:21-47' },
    { kind: 'code', ref: 'api/src/Pps.Domain/Annotations/GeometryValidator.cs' },
    { kind: 'adr', ref: 'docs/adr/0016-autorizacion-por-proyecto-y-sesion.md' },
  ],
  priority: 'P1',
};

const spaInterna: DiagramDef = {
  id: 'spa-interna',
  kind: 'flowchart',
  title: 'La SPA por dentro',
  summary:
    `Carpetas de la interfaz web. La aplicación, con su router propio, abre ingreso, catálogo, ` +
    `visor, usuarios, miembros y esta guía, que se carga bajo demanda. El catálogo usa la subida ` +
    `de imágenes y las reglas de acceso, que solo ocultan controles: la API es la que autoriza. ` +
    `Ingreso, catálogo, miembros, usuarios y subida llaman a la API por un cliente común, y el ` +
    `visor es el único que importa OpenSeadragon. Lo planificado, el editor de anotaciones y ` +
    `las pantallas de clases, importar y exportar, no existe todavía.`,
  source: `flowchart TB
  app["${g('done')} app<br/>router propio, sesión y errores"]${c('done')}
  f_auth["${g('done')} auth<br/>ingreso y sesión"]${c('done')}
  f_catalog["${g('partial')} catalog<br/>sin pantalla de clases"]${c('partial')}
  f_viewer["${g('done')} viewer<br/>visor de imágenes"]${c('done')}
  f_users["${g('done')} users<br/>alta y listado"]${c('done')}
  f_members["${g('done')} members<br/>miembros del proyecto"]${c('done')}
  f_upload["${g('done')} upload<br/>cola de subida"]${c('done')}
  f_gia["${g('done')} gia<br/>esta guía"]${c('done')}
  f_access["${g('done')} access<br/>can() oculta, no autoriza"]${c('done')}
  shared["${g('done')} shared<br/>apiFetch y cookie"]${c('done')}
  osd["${g('done')} OsdImageViewer<br/>único import de OpenSeadragon"]${c('done')}
  p_annotations["${g('editor')} annotations<br/>editor de anotaciones"]${c('editor')}
  p_screens["${g('classesScreen')} clases, importar, exportar<br/>pantallas sin construir"]${c('classesScreen')}
  app --> f_auth
  app --> f_catalog
  app --> f_viewer
  app --> f_users
  app --> f_members
  app -->|"carga diferida"| f_gia
  f_catalog --> f_upload
  f_catalog -->|"can()"| f_access
  f_auth --> shared
  f_catalog --> shared
  f_members --> shared
  f_users --> shared
  f_upload --> shared
  f_viewer --> osd
  p_annotations -.->|"capa de dibujo"| osd
  p_screens -.-> app`,
  usesStatus: true,
  sources: [
    { kind: 'code', ref: 'web/src/app/App.tsx', note: 'rutas y pantallas' },
    { kind: 'code', ref: 'web/src/features/access/access.ts', note: 'can() solo oculta' },
    { kind: 'code', ref: 'web/src/features/viewer/OsdImageViewer.ts' },
    {
      kind: 'config',
      ref: 'web/eslint.config.js:24-41',
      note: 'OpenSeadragon solo en el adaptador',
    },
    {
      kind: 'doc',
      ref: 'docs/arquitectura/03-bloques-y-ejecucion.md:60-83',
      note: 'SPA (C4, nivel 3)',
    },
  ],
  priority: 'P1',
};

export const diagrams: readonly DiagramDef[] = [contenedores, contexto, apiInterna, spaInterna];
