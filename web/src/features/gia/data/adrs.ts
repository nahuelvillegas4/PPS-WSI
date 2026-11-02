import type { Evidence } from '../model/status';
import type { AdrRow, Block } from '../model/types';

/**
 * One row per ADR, with its decision state and how much of it is in code. Owner: U6.
 *
 * `decision` copies the index of `docs/adr/README.md` (a test compares both), and `qualifier`
 * carries the part of the state line that the index does not fit in one word. `inCode` is a
 * verdict about the repository, so `ADR_EVIDENCE` below lists the files that back it and the
 * test of the decisions stop pins the missing pieces of the partial ones.
 *
 * Decided and built are different axes: ADR-07 is proposed and already in code, ADR-05 is decided
 * and only partly in code. Nothing here may say a proposed ADR was accepted.
 */
export const ADRS: readonly AdrRow[] = [
  {
    n: 1,
    title: 'SPA y dos servicios detrás de una pasarela Nginx, en un único origen',
    decision: 'DECIDIDO',
    inCode: 'done',
    sentence:
      'La SPA estática, la API y las teselas se sirven detrás de una pasarela Nginx con un único origen: /, /api/ y /tiles/.',
    pending:
      'Falta la prueba de humo del despliegue; la base de datos y la API también se publican en desarrollo y está previsto retirarlo.',
  },
  {
    n: 2,
    title: 'Teselas DZI al vuelo y un solo camino para JPG/PNG y SVS',
    decision: 'DECIDIDO',
    inCode: 'done',
    sentence:
      'Las teselas se generan al vuelo (254 px, solape 1, JPEG) y un único camino abre JPG, PNG y SVS.',
    pending: 'Volver a medir la fluidez (QS-4) ahora que cada tesela consulta la membresía.',
  },
  {
    n: 3,
    title: 'Cada dato tiene un dueño; la pasarela resuelve imagen → archivo',
    decision: 'DECIDIDO',
    inCode: 'done',
    sentence:
      'La API es dueña del catálogo, solo el servicio de teselas abre archivos y la pasarela traduce cada imagen en su archivo tras consultar a la API.',
    pending: 'Prueba de humo que compruebe el 401 sin sesión y el 200 de una imagen registrada.',
  },
  {
    n: 4,
    title: 'Sesión por cookie de punta a punta; teselas autorizadas con auth_request',
    decision: 'DECIDIDO',
    qualifier:
      'mecanismo decidido; los roles pasan al ADR-15 (PROPUESTO) y el resto de la política de usuarios sigue PROPUESTO',
    inCode: 'done',
    sentence:
      'La sesión viaja en una cookie HttpOnly y SameSite=Lax de punta a punta, y la pasarela consulta a la API (auth_request) antes de servir cada tesela.',
    pending:
      'Script de alta de usuarios; los roles los reemplaza el ADR-15 y el resto de la política de usuarios sigue propuesto.',
  },
  {
    n: 5,
    title: 'Convenciones comunes y contrato como artefacto versionado',
    decision: 'DECIDIDO',
    inCode: 'partial',
    sentence:
      'Convenciones comunes (camelCase, errores RFC 9457, rutas /v1) y un contrato escrito primero en contract/ y versionado.',
    pending:
      'Integración continua que compare la OpenAPI generada con el contrato y tipos TypeScript generados desde él; hoy el cliente de la web se escribió a mano.',
  },
  {
    n: 6,
    title: 'Geometrías en nivel 0: el servidor valida y nunca transforma',
    decision: 'DECIDIDO',
    qualifier:
      'decididos el sistema de coordenadas y la validación; los límites numéricos siguen PROPUESTO',
    inCode: 'done',
    sentence:
      'Las geometrías (rectángulo y polígono) van en píxeles de nivel 0 y el servidor las valida en un orden fijo sin transformarlas nunca.',
    pending:
      'Los límites numéricos siguen propuestos en el ADR aunque el tope de vértices ya está en el código.',
  },
  {
    n: 7,
    title: 'Modelo de datos, autoría y conjuntos por usuario',
    decision: 'PROPUESTO',
    inCode: 'done',
    sentence:
      'Proyecto, dataset e imagen en cadena, clases por dataset, geometría en JSONB, autor y fechas del servidor, borrado lógico, versión por xmin y claves foráneas compuestas.',
    pending: 'Las pruebas corren sobre SQLite y no sobre PostgreSQL real, que era lo previsto.',
  },
  {
    n: 8,
    title: 'Frontera HTTP entre prácticas y reparto del editor',
    decision: 'PROPUESTO',
    inCode: 'partial',
    sentence:
      'Opción A: la PPS 1 hace la interacción del editor en el navegador y la PPS 2 el ciclo de vida de la anotación en el servidor; la frontera es HTTP.',
    pending:
      'El editor en el navegador no existe y el repositorio no registra la respuesta de la supervisión sobre el reparto (S1).',
  },
  {
    n: 9,
    title: 'Importación por adaptadores, empezando por CRIC',
    decision: 'PROPUESTO',
    inCode: 'done',
    sentence:
      'La importación usa adaptadores; CRIC entra como cajas de 100 px, de forma síncrona y atómica, con dryRun por defecto y 409 al reimportar.',
    pending: 'Adaptador para CCEDD (no existe) y formato exacto de CRIC por verificar.',
  },
  {
    n: 10,
    title: 'JSON interno como fuente de verdad; COCO obligatorio',
    decision: 'PROPUESTO',
    inCode: 'partial',
    sentence:
      'El JSON interno es la fuente de verdad y de él salen COCO (obligatorio) y YOLO (condicional).',
    pending: 'YOLO: hoy la API responde 422 unsupported-format.',
  },
  {
    n: 11,
    title: 'Un Compose, dos entornos',
    decision: 'DECIDIDO',
    qualifier: 'la alternativa de máquina virtual sigue PROPUESTO',
    inCode: 'partial',
    sentence:
      'Un solo Compose para dos entornos, con migraciones y administrador inicial al arrancar y healthchecks encadenados.',
    pending:
      'Compose del servidor, scripts de descarga de muestras, de respaldo y de prueba de humo, e integración continua.',
  },
  {
    n: 12,
    title: 'Privacidad de las imágenes y datos de prueba',
    decision: 'DECIDIDO',
    qualifier: 'la anonimización está PENDIENTE',
    inCode: 'partial',
    sentence:
      'No se sirven la etiqueta ni la imagen macro de los archivos SVS, los metadatos salen por lista blanca y no hay imágenes en el repositorio.',
    pending:
      'Scripts de descarga con suma de verificación, prueba automática sobre todas las rutas (QS-8), rechazo de binarios en CI y anonimización.',
  },
  {
    n: 13,
    title: 'Un único repositorio con una carpeta por módulo',
    decision: 'DECIDIDO',
    inCode: 'partial',
    sentence:
      'Un único repositorio con una carpeta por módulo: api, tiles, web, contract, deploy, docs, scripts y data.',
    pending:
      'CODEOWNERS, integración continua por ruta y protección de la rama principal (sin verificar en GitHub).',
  },
  {
    n: 14,
    title: 'Línea base de versiones y política de actualización',
    decision: 'DECIDIDO',
    inCode: 'partial',
    sentence:
      'Versiones exactas en lockfiles y etiquetas de imagen, y actualizaciones por PR con CI verde y nota en el CHANGELOG.',
    pending:
      'Lock de NuGet y etiquetas exactas en varias imágenes base (base de datos, SDK de .NET, Python y Node).',
  },
  {
    n: 15,
    title: 'Roles por proyecto mediante membresías; el rol global queda en admin o user',
    decision: 'PROPUESTO',
    inCode: 'partial',
    sentence:
      'Roles por proyecto mediante membresías: users.role es admin o user y, en cada proyecto, viewer < annotator < project-admin; quien no es miembro recibe 404.',
    pending:
      'La regla protected-user (409), la baja de membresías al promover a admin, el límite 429 al asignar miembros y la actualización de los documentos de arquitectura.',
  },
  {
    n: 16,
    title:
      'Un único punto de autorización por proyecto, con sesión revalidada y teselas autorizadas por membresía',
    decision: 'PROPUESTO',
    inCode: 'partial',
    sentence:
      'Un único punto de autorización: política pura, guarda global que falla cerrado y teselas autorizadas por membresía.',
    pending:
      'Validador de sesión, guarda Sec-Fetch-Site, endurecimiento del arranque, pruebas por HTTP, respaldo de la base y nueva medición de QS-4.',
  },
  {
    n: 17,
    title: 'Subida desde el navegador: una petición por archivo y confirmación sin sobrescribir',
    decision: 'PROPUESTO',
    inCode: 'partial',
    sentence:
      'La SPA sube un archivo por petición con cola, progreso y cancelación sobre el endpoint existente; el servidor debe confirmar sin sobrescribir.',
    pending:
      'Prefiltro 400/413/507, escritura .part sin sobrescribir (hoy se sobrescribe un archivo con el mismo nombre), ubicación de Nginx de 1800 s y reintento en la web.',
  },
];

/** A piece of evidence that backs the `inCode` verdict of one ADR. */
export interface AdrEvidence extends Evidence {
  adr: number;
}

/**
 * Files that back the verdict of each ADR (checked to exist by a test). The pending part of a
 * partial ADR is pinned the other way round: a test searches the code for what is still missing.
 */
export const ADR_EVIDENCE: readonly AdrEvidence[] = [
  {
    adr: 1,
    kind: 'config',
    ref: 'deploy/gateway/nginx.conf',
    note: 'Un solo origen: SPA, /api/ y /tiles/',
  },
  { adr: 2, kind: 'code', ref: 'tiles/app/slides.py', note: 'Teselas DZI de 254 px con solape 1' },
  {
    adr: 3,
    kind: 'code',
    ref: 'tiles/app/storage.py',
    note: 'El servicio de teselas resuelve la clave de archivo',
  },
  {
    adr: 4,
    kind: 'code',
    ref: 'api/src/Pps.Api/Program.cs',
    note: 'Cookie de sesión HttpOnly y SameSite=Lax',
  },
  {
    adr: 5,
    kind: 'contract',
    ref: 'contract/openapi/api.v1.yaml',
    note: 'Contrato escrito primero',
  },
  {
    adr: 6,
    kind: 'code',
    ref: 'api/src/Pps.Domain/Annotations/GeometryValidator.cs',
    note: 'Validación en orden fijo',
  },
  {
    adr: 7,
    kind: 'code',
    ref: 'api/src/Pps.Infrastructure/Persistence/AppDbContext.cs',
    note: 'Modelo con claves compuestas y versión por xmin',
  },
  {
    adr: 8,
    kind: 'code',
    ref: 'web/src/features/viewer/ImageViewer.ts',
    note: 'Interfaz del visor que usará el editor',
  },
  {
    adr: 9,
    kind: 'code',
    ref: 'api/src/Pps.Infrastructure/Import/CricImporter.cs',
    note: 'Importador CRIC con dryRun',
  },
  {
    adr: 10,
    kind: 'code',
    ref: 'api/src/Pps.Infrastructure/Export/CocoExporter.cs',
    note: 'Exportación COCO',
  },
  { adr: 11, kind: 'config', ref: 'compose.yaml', note: 'Un Compose con healthchecks encadenados' },
  {
    adr: 12,
    kind: 'code',
    ref: 'tiles/app/inspection.py',
    note: 'Solo nombres de imágenes asociadas, por lista blanca',
  },
  { adr: 13, kind: 'doc', ref: 'README.md', note: 'Una carpeta por módulo' },
  { adr: 14, kind: 'config', ref: 'web/package-lock.json', note: 'Versiones exactas bloqueadas' },
  {
    adr: 15,
    kind: 'code',
    ref: 'api/src/Pps.Domain/Access/AccessPolicy.cs',
    note: 'El administrador global actúa como administrador de proyecto',
  },
  {
    adr: 16,
    kind: 'code',
    ref: 'api/src/Pps.Api/Common/Access/AccessGuardFilter.cs',
    note: 'Guarda global que falla cerrado',
  },
  {
    adr: 16,
    kind: 'test',
    ref: 'api/tests/Pps.Domain.Tests/AuthorizationMatrixTests.cs',
    note: 'La matriz de 40 operaciones verificada por reflexión',
  },
  {
    adr: 17,
    kind: 'code',
    ref: 'web/src/features/upload/uploadQueue.ts',
    note: 'Cola de subida de un archivo por petición',
  },
];

export function adrLabel(n: number): string {
  return `ADR-${String(n).padStart(2, '0')}`;
}

export type QuadrantCell = Extract<Block, { kind: 'quadrants' }>['cells'][number];

/** Columns of the quadrant: the state of the decision against how much of it is in code. */
const QUADRANTS: readonly Pick<QuadrantCell, 'decision' | 'realised'>[] = [
  { decision: 'DECIDIDO', realised: 'realizado' },
  { decision: 'DECIDIDO', realised: 'parcial' },
  { decision: 'PROPUESTO', realised: 'realizado' },
  { decision: 'PROPUESTO', realised: 'parcial' },
];

/** Where an ADR stands in code: `done` is realised, `partial` only in part. */
export function realisedOf(row: AdrRow): QuadrantCell['realised'] {
  return row.inCode === 'done' ? 'realizado' : 'parcial';
}

/** The four quadrant cells, counted from the rows: nothing about the totals is typed by hand. */
export function adrQuadrants(rows: readonly AdrRow[]): QuadrantCell[] {
  return QUADRANTS.map(({ decision, realised }) => ({
    decision,
    realised,
    items: rows
      .filter((row) => row.decision === decision && realisedOf(row) === realised)
      .map((row) => adrLabel(row.n)),
  }));
}
