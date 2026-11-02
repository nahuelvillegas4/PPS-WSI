/** Tables of the progress stop: `epicas` (by epic) and `deuda-seguridad` (debt and security). */
import { statusOf, type StatusRef } from '../../model/diagramKit';
import { SNAPSHOT, STATUS_META, type Status } from '../../model/status';
import type { Cell, TableDef } from '../../model/types';
import { evidenceOf } from './evidence';

function chip(status: StatusRef, text: string): Cell {
  return { status: statusOf(status), text };
}

/** A status cell that says its own label first, so the cell cannot disagree with the status. */
function labelled(status: StatusRef, suffix = ''): Cell {
  const resolved: Status = statusOf(status);
  return { status: resolved, text: `${STATUS_META[resolved].label}${suffix}` };
}

// Epics ---------------------------------------------------------------------------------------

export interface EpicRow {
  /** Epic id and name, as in the architecture map (section 14). */
  epic: string;
  api: Cell;
  web: Cell;
  /** Repo paths shown in the evidence column (and cited as sources). */
  evidence: readonly string[];
}

/** Epics E1 to E11 against the code of `main` at the snapshot. Tripwire items read `FEATURES`. */
export const EPICS: readonly EpicRow[] = [
  {
    epic: 'E1 Plataforma y entrega',
    api: chip(
      'partial',
      'Repositorio único y Compose con la pasarela, la API, las teselas y la base; faltan integración continua, prueba de humo y CODEOWNERS',
    ),
    web: 'No aplica',
    evidence: ['compose.yaml'],
  },
  {
    epic: 'E2 Autenticación y usuarios',
    api: chip('done', 'Cookie de sesión, alta y edición de usuarios y bloqueo por intentos (429)'),
    web: chip('done', 'Pantalla de ingreso y pantalla de usuarios'),
    evidence: [
      'api/src/Pps.Api/Controllers/Auth/AuthController.cs',
      'web/src/features/users/UsersPage.tsx',
    ],
  },
  {
    epic: 'E3 Catálogo',
    api: chip('done', 'Proyectos, datasets y clases de etiquetado'),
    web: chip('partial', 'Proyectos y datasets; sin pantalla de clases'),
    evidence: [
      'api/src/Pps.Api/Controllers/Catalog/ClassesController.cs',
      'web/src/features/catalog/CatalogPage.tsx',
    ],
  },
  {
    epic: 'E4 Registro de imágenes',
    api: chip('done', 'Explorador del volumen, registro por clave y subida multipart'),
    web: chip('done', 'Ventana de registro y ventana de subida'),
    evidence: [
      'api/src/Pps.Api/Controllers/Images/ImagesController.cs',
      'web/src/features/upload/UploadImagesModal.tsx',
    ],
  },
  {
    epic: 'E5 Teselas y visor',
    api: chip('done', 'Descriptor DZI, teselas, inspección y salud'),
    web: chip(
      'done',
      'Visor con OpenSeadragon; el visor simple para probar el editor está planificado',
    ),
    evidence: ['tiles/app/routes.py', 'web/src/features/viewer/OsdImageViewer.ts'],
  },
  {
    epic: 'E6 Editor en el navegador',
    api: 'No aplica',
    web: chip('editor', 'Sin herramientas de dibujo: el visor solo reserva el clic'),
    evidence: [
      'web/src/features/viewer/ImageViewer.ts',
      'web/src/features/viewer/OsdImageViewer.ts',
    ],
  },
  {
    epic: 'E7 Ciclo de vida de anotaciones',
    api: chip(
      'done',
      'Alta, edición y baja, ETag e If-Match, borrado lógico y autoría (403 también para la administración global)',
    ),
    web: chip('editor', 'Sin interfaz: depende del editor'),
    evidence: [
      'api/src/Pps.Api/Controllers/Annotations/AnnotationsController.cs',
      'api/tests/Pps.Domain.Tests/AnnotationLifecycleAndConcurrencyTests.cs',
    ],
  },
  {
    epic: 'E8 Importación',
    api: chip('done', 'CRIC con dryRun, informe e importaciones registradas'),
    web: chip('importScreen', 'Sin pantalla'),
    evidence: [
      'api/src/Pps.Api/Controllers/IO/ImportsController.cs',
      'api/src/Pps.Infrastructure/Import/CricImporter.cs',
    ],
  },
  {
    epic: 'E9 Exportación',
    api: chip('done', 'JSON interno y COCO; YOLO (condicional) responde 422'),
    web: chip('exportScreen', 'Sin pantalla'),
    evidence: [
      'api/src/Pps.Api/Controllers/IO/ExportController.cs',
      'api/src/Pps.Infrastructure/Export/CocoExporter.cs',
    ],
  },
  {
    epic: 'E10 Despliegue y documentación',
    api: chip(
      'composeServer',
      'Sin servidor del laboratorio (S2 sin respuesta), manuales, informe final ni backlog',
    ),
    web: chip('planned', 'Pantallas de gestión completas y manuales (I5)'),
    evidence: [
      'docs/arquitectura/07-pendientes.md',
      'docs/arquitectura/06-organizacion-y-roadmap.md',
    ],
  },
  {
    epic: 'E11 Calidad transversal',
    api: chip('partial', 'Privacidad de imágenes y pruebas; sin integración continua'),
    web: chip('partial', 'Pruebas unitarias de la web; sin pruebas de interfaz automatizadas'),
    evidence: ['tiles/app/inspection.py', 'web/src/features/viewer/coordinates.test.ts'],
  },
];

export function epicasTable(rows: readonly EpicRow[] = EPICS): TableDef {
  return {
    id: 'epicas',
    title: 'Avance por épica',
    caption: `Épicas del mapa de la arquitectura (§14), contra el código de main al ${SNAPSHOT.label} (commit ${SNAPSHOT.commit}). Lo que ya existe en la API pero no en la interfaz figura como planificado en la columna Interfaz.`,
    columns: [
      { key: 'epic', label: 'Épica' },
      { key: 'api', label: 'API o servicio', filterable: true },
      { key: 'web', label: 'Interfaz', filterable: true },
      { key: 'evidence', label: 'Evidencia' },
    ],
    rows: rows.map((row) => ({
      epic: row.epic,
      api: row.api,
      web: row.web,
      evidence: row.evidence.join(', '),
    })),
    sources: evidenceOf(rows.flatMap((row) => row.evidence)),
  };
}

// Debt and security -----------------------------------------------------------------------------

export interface DebtRow {
  topic: string;
  state: Cell;
  evidence: readonly string[];
}

/**
 * Known debt and security gaps, from the ADRs and the code. A row names a gap, never a value:
 * no password, key, port or address appears here, and a test scans for them.
 */
export const DEBT: readonly DebtRow[] = [
  {
    topic:
      'Sin validador de sesión: desactivar a un usuario o cambiar su rol global no corta una cookie ya emitida, hasta 8 horas',
    state: labelled('sessionValidator', ' (ADR-16)'),
    evidence: ['docs/adr/0016-autorizacion-por-proyecto-y-sesion.md:102'],
  },
  {
    topic: 'Sin guarda contra CSRF (Sec-Fetch-Site) en la subida multipart',
    state: labelled('csrfGuard', ' (ADR-16)'),
    evidence: ['docs/adr/0016-autorizacion-por-proyecto-y-sesion.md:102'],
  },
  {
    topic: 'Sin TLS ni definición del acceso externo (S3): falta decidirlo con la supervisión',
    state: labelled('tls'),
    evidence: ['deploy/README.md:49', 'docs/arquitectura/07-pendientes.md'],
  },
  {
    topic: 'Sin Content-Security-Policy compatible con OpenSeadragon',
    state: labelled('planned'),
    evidence: ['deploy/README.md:49'],
  },
  {
    topic:
      'Los puertos de la base de datos y de la API se publican en todas las interfaces en desarrollo',
    state: labelled('planned', ' (ADR-16)'),
    evidence: ['compose.yaml:11-12', 'compose.yaml:36-39'],
  },
  {
    topic:
      'Contraseñas por defecto: la del administrador inicial está escrita en el código y la de la base de datos, en el Compose',
    state: labelled('planned'),
    evidence: [
      'api/src/Pps.Infrastructure/Persistence/DatabaseInitializer.cs:28',
      'compose.yaml:9',
    ],
  },
  {
    topic: 'El arranque registra cualquier error de migración como aviso y sigue',
    state: labelled('planned', ' (ADR-16)'),
    evidence: ['api/src/Pps.Infrastructure/Persistence/DatabaseInitializer.cs:50-53'],
  },
  {
    topic:
      'La subida puede sobrescribir un archivo con el mismo nombre y no tiene prefiltro 400, 413 ni 507',
    state: labelled('planned', ' (ADR-17)'),
    evidence: [
      'docs/adr/0017-subida-de-imagenes-desde-el-navegador.md:97',
      'api/src/Pps.Infrastructure/Storage/PhysicalStorageService.cs:101',
    ],
  },
  {
    topic:
      'Respuestas documentadas en el contrato y todavía no aplicadas: 429 al asignar miembros, 409 protected-user, 413, 507 y 409 storage-key-in-use',
    state: labelled('planned'),
    evidence: ['contract/CHANGELOG.md:33'],
  },
  {
    topic:
      'El bloqueo de ingreso vive en memoria: cualquiera sin sesión puede provocarlo y se pierde al reiniciar',
    state: labelled('planned', ' (ADR-16)'),
    evidence: ['docs/adr/0016-autorizacion-por-proyecto-y-sesion.md:85'],
  },
  {
    topic: 'Sin integración continua: el contrato y las pruebas se verifican a mano',
    state: labelled('ci'),
    evidence: ['docs/adr/0016-autorizacion-por-proyecto-y-sesion.md:5'],
  },
  {
    topic:
      'Anonimización de imágenes asociadas pendiente: se guardan la etiqueta y la imagen macro y solo se evita servirlas',
    state: labelled('planned', ' (ADR-12)'),
    evidence: ['docs/adr/0012-privacidad-y-datos-de-prueba.md', 'tiles/app/inspection.py'],
  },
];

export function deudaSeguridadTable(rows: readonly DebtRow[] = DEBT): TableDef {
  return {
    id: 'deuda-seguridad',
    title: 'Deuda y seguridad conocidas',
    caption: `Cada fila nombra una brecha y su evidencia, sin valores ni credenciales. Estado al ${SNAPSHOT.label} sobre ${SNAPSHOT.commit}.`,
    columns: [
      { key: 'topic', label: 'Tema' },
      { key: 'state', label: 'Estado', filterable: true },
      { key: 'evidence', label: 'Evidencia' },
    ],
    rows: rows.map((row) => ({
      topic: row.topic,
      state: row.state,
      evidence: row.evidence.join(', '),
    })),
    sources: evidenceOf(rows.flatMap((row) => row.evidence)),
  };
}

export const tables: readonly TableDef[] = [epicasTable(), deudaSeguridadTable()];
