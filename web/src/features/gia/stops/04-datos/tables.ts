import { FACTS } from '../../model/facts';
import type { Cell, ColumnDef, TableDef } from '../../model/types';

const SNAPSHOT_PATH =
  'api/src/Pps.Infrastructure/Persistence/Migrations/AppDbContextModelSnapshot.cs';
const MIGRATIONS_DIR = 'api/src/Pps.Infrastructure/Persistence/Migrations';

interface TableData {
  name: string;
  purpose: string;
  keys: string;
  invariant: string;
}

/** The tables of the model snapshot; a test compares these names with its `ToTable` calls. */
export const IMPLEMENTED_TABLES: readonly TableData[] = [
  {
    name: 'users',
    purpose: 'Cuentas de acceso. Lleva el rol global: administrador o usuario.',
    keys: 'PK id; username único. Referenciada con RESTRICT: la base no deja borrar un usuario con anotaciones, importaciones o membresías.',
    invariant:
      'El rol solo puede ser admin o user (CHECK). Un usuario de sistema, como el que firma las importaciones, no puede ingresar.',
  },
  {
    name: 'projects',
    purpose: 'Agrupa datasets y define qué ve cada miembro.',
    keys: 'PK id; name único. No se borra si tiene datasets (409 not-empty); sus membresías se borran en cascada.',
    invariant: 'Dos proyectos no pueden llamarse igual.',
  },
  {
    name: 'project_members',
    purpose: 'Rol de cada usuario en cada proyecto (ADR-15).',
    keys: 'PK compuesta (project_id, user_id). CASCADE desde projects; RESTRICT hacia users, incluido quien otorgó el rol.',
    invariant:
      'El rol solo puede ser viewer, annotator o project-admin (CHECK). Una sola membresía por usuario y proyecto.',
  },
  {
    name: 'datasets',
    purpose: 'Conjunto de imágenes y clases dentro de un proyecto.',
    keys: 'PK id; FK project_id RESTRICT. No se borra si tiene imágenes (409 not-empty).',
    invariant:
      'El nombre es único por proyecto solo en código (409 duplicate-name); la base no lo impone.',
  },
  {
    name: 'label_classes',
    purpose: 'Clases de etiquetado de un dataset: nombre, color y orden.',
    keys: 'PK id; clave alterna (dataset_id, id); FK dataset_id RESTRICT. No se borra si tiene anotaciones (409 class-in-use).',
    invariant: 'El nombre es único por dataset solo en código; la base no lo impone.',
  },
  {
    name: 'images',
    purpose:
      'Imágenes registradas, WSI o convencionales, con su tamaño en nivel 0 y su cantidad de niveles.',
    keys: 'PK id; clave alterna (dataset_id, id); FK dataset_id RESTRICT; índice único (dataset_id, storage_key).',
    invariant:
      'La misma clave de almacenamiento no se registra dos veces en un dataset (409 already-registered).',
  },
  {
    name: 'annotations',
    purpose: 'Geometrías dibujadas o importadas, en píxeles de nivel 0, con su autor y su clase.',
    keys: 'PK id; cuatro FK: dataset CASCADE, imagen y clase compuestas RESTRICT, autor RESTRICT.',
    invariant:
      'La clase pertenece al dataset de la imagen (claves compuestas). Borrado lógico con deleted_at y versión xmin para el ETag.',
  },
  {
    name: 'imports',
    purpose: 'Registro de cada importación: fuente, contadores e informe.',
    keys: 'PK id; FK dataset_id e imported_by_id RESTRICT.',
    invariant:
      'Reimportar la misma fuente en un dataset se rechaza solo en código (409 already-imported).',
  },
];

/**
 * Extensions named in the architecture document (section 5.4): out of scope of both statements,
 * with no schedule and no decided column. They are not "planned": the page calls them extensions.
 */
export const EXTENSION_TABLES: readonly TableData[] = [
  {
    name: 'annotation_revisions',
    purpose: 'Historial de cambios de cada anotación, de solo inserción.',
    keys: 'Sin migrar; columnas sin decidir. El nombre es provisional.',
    invariant: 'Sin decidir.',
  },
  {
    name: 'image_review_state',
    purpose: 'Estado de revisión de cada imagen, para una cola de revisión.',
    keys: 'Sin migrar; tabla y columnas sin decidir. El nombre es provisional.',
    invariant: 'Sin decidir.',
  },
];

/** What the state column says about an extension, in place of the default status word. */
export const EXTENSION_STATE = 'Extensión prevista, fuera de alcance';

function tableRow(data: TableData, state: Cell): Record<string, Cell> {
  return {
    tabla: { mono: data.name },
    proposito: data.purpose,
    claves: data.keys,
    invariante: data.invariant,
    estado: state,
  };
}

const TABLAS_COLUMNS: readonly ColumnDef[] = [
  { key: 'tabla', label: 'Tabla' },
  { key: 'proposito', label: 'Propósito' },
  { key: 'claves', label: 'Claves y borrado' },
  { key: 'invariante', label: 'Invariante clave' },
  { key: 'estado', label: 'Estado', align: 'center' },
];

const tablas: TableDef = {
  id: 'tablas',
  title: 'Las tablas',
  caption: `${FACTS.tables} tablas implementadas y ${EXTENSION_TABLES.length} de extensión, fuera de alcance y sin cronograma. Entre paréntesis, la respuesta que da la API cuando la regla se rompe.`,
  columns: TABLAS_COLUMNS,
  rows: [
    ...IMPLEMENTED_TABLES.map((data) => tableRow(data, { status: 'done' })),
    ...EXTENSION_TABLES.map((data) => tableRow(data, { status: 'unknown', text: EXTENSION_STATE })),
  ],
  sources: [
    { kind: 'code', ref: SNAPSHOT_PATH },
    { kind: 'code', ref: 'api/src/Pps.Infrastructure/Persistence/AppDbContext.cs' },
    { kind: 'adr', ref: 'docs/adr/0007-modelo-de-datos-y-autoria.md' },
    { kind: 'doc', ref: 'docs/arquitectura/03-bloques-y-ejecucion.md' },
    {
      kind: 'doc',
      ref: 'docs/arquitectura/03-bloques-y-ejecucion.md:146-158',
      note: 'puntos de extensión',
    },
  ],
};

// Integrity rules --------------------------------------------------------------------------

interface RuleData {
  rule: string;
  where: string;
  test: string;
}

/** Marker of the rules the page says have no test; a test searches `api/tests` for their slugs. */
export const NO_TEST = 'Sin prueba automática.';

export const INTEGRITY_RULES: readonly RuleData[] = [
  {
    rule: 'La clase de una anotación pertenece al dataset de su imagen.',
    where: 'Base de datos (dos claves foráneas compuestas) y código (422 class-not-in-dataset).',
    test: 'AnnotationLifecycleAndConcurrencyTests cubre la validación de la API; la restricción de la base no se prueba sobre PostgreSQL.',
  },
  {
    rule: 'Una sola membresía por usuario y proyecto.',
    where: 'Base de datos (clave primaria compuesta).',
    test: 'ProjectMembershipSchemaTests: la clave primaria es única.',
  },
  {
    rule: 'Los roles solo toman valores válidos: admin o user; viewer, annotator o project-admin.',
    where: 'Base de datos (dos CHECK) y código (la escalera se compara en C#).',
    test: 'ProjectMembershipSchemaTests: el CHECK rechaza un rol fuera de la escalera y annotator como rol global.',
  },
  {
    rule: 'Dos ediciones simultáneas de una anotación no se pisan (ETag).',
    where: 'Base de datos (columna xmin de PostgreSQL) y código (If-Match: 428 y 412).',
    test: 'AnnotationLifecycleAndConcurrencyTests corre sobre SQLite, que usa un contador en lugar de xmin.',
  },
  {
    rule: 'Una clave de almacenamiento no se registra dos veces en un dataset.',
    where: 'Base de datos (índice único) y código (409 already-registered).',
    test: 'StorageAndWsiTests cubre el 409; el índice no se prueba sobre PostgreSQL.',
  },
  {
    rule: 'Un proyecto con datasets, o un dataset con imágenes, no se borra.',
    where: 'Base de datos (ON DELETE RESTRICT) y código (409 not-empty).',
    test: NO_TEST,
  },
  {
    rule: 'Una clase en uso no se borra, aunque sus anotaciones estén borradas lógicamente.',
    where: 'Código (409 class-in-use, que cuenta las borradas) y base de datos (RESTRICT).',
    test: NO_TEST,
  },
  {
    rule: 'El nombre de un dataset es único en su proyecto, y el de una clase en su dataset.',
    where: 'Solo código (409 duplicate-name); la base no tiene restricción única.',
    test: NO_TEST,
  },
  {
    rule: 'Una fuente de importación no se repite en un dataset.',
    where:
      'Solo código (409 already-imported); la base no tiene restricción única y no se verificó qué pasa con dos importaciones simultáneas.',
    test: 'CricImportTests cubre el rechazo de una segunda importación de la misma fuente.',
  },
  {
    rule: 'Borrar una anotación la marca como borrada, no la elimina.',
    where: 'Código: filtro de consulta de EF sobre deleted_at, no un objeto de la base.',
    test: 'AnnotationLifecycleAndConcurrencyTests cubre el borrado lógico.',
  },
];

const integridad: TableDef = {
  id: 'integridad',
  title: 'Integridad: qué impone la base y qué impone el código',
  caption:
    'Las pruebas de la API corren sobre SQLite: lo que depende de PostgreSQL real (claves foráneas, xmin, migraciones) no se ejecuta en ellas.',
  columns: [
    { key: 'regla', label: 'Regla' },
    { key: 'donde', label: 'Dónde se impone' },
    { key: 'prueba', label: 'Prueba' },
  ],
  rows: INTEGRITY_RULES.map((data) => ({
    regla: data.rule,
    donde: data.where,
    prueba: data.test,
  })),
  sources: [
    { kind: 'code', ref: SNAPSHOT_PATH },
    { kind: 'code', ref: 'api/src/Pps.Api/Controllers/Catalog/DatasetsController.cs' },
    { kind: 'code', ref: 'api/src/Pps.Api/Controllers/Catalog/ClassesController.cs' },
    { kind: 'code', ref: 'api/src/Pps.Infrastructure/Import/CricImporter.cs' },
    { kind: 'test', ref: 'api/tests/Pps.Domain.Tests/ProjectMembershipSchemaTests.cs' },
    { kind: 'test', ref: 'api/tests/Pps.Domain.Tests/AnnotationLifecycleAndConcurrencyTests.cs' },
  ],
  collapsible: true,
};

// Migrations -------------------------------------------------------------------------------

interface MigrationData {
  /** File name without extension; the id EF stores in its history table. */
  name: string;
  date: string;
  adds: string;
}

/** The migrations of the model, oldest first; a test compares their names with the repository. */
export const MIGRATIONS: readonly MigrationData[] = [
  {
    name: '20261017193043_InitialCreate',
    date: '17/10/2026',
    adds: 'Crea projects, users, datasets, images, label_classes y annotations con sus claves, las claves alternas compuestas y los índices.',
  },
  {
    name: '20261021230741_AddImageFormatAndLevelCount',
    date: '21/10/2026',
    adds: 'Agrega format y level_count a images, y el índice único (dataset_id, storage_key).',
  },
  {
    name: '20261027134318_AddImportsTable',
    date: '27/10/2026',
    adds: 'Crea imports (ADR-09) con dos claves foráneas y dos índices.',
  },
  {
    name: '20261101194357_AddProjectMembership',
    date: '01/11/2026',
    adds: 'Crea project_members (clave compuesta, CHECK de rol y tres claves foráneas) y el CHECK del rol global; antes convierte a user todo rol que no sea admin. No rellena membresías. Su reversa borra la tabla y pierde las asignaciones.',
  },
];

const migraciones: TableDef = {
  id: 'migraciones',
  title: 'Migraciones',
  caption: `${FACTS.migrations} migraciones de EF Core, todas con reversa. Las fechas salen del nombre del archivo.`,
  columns: [
    { key: 'migracion', label: 'Migración' },
    { key: 'fecha', label: 'Fecha' },
    { key: 'agrega', label: 'Qué agrega' },
  ],
  rows: MIGRATIONS.map((data) => ({
    migracion: { mono: data.name },
    fecha: data.date,
    agrega: data.adds,
  })),
  sources: MIGRATIONS.map((data) => ({
    kind: 'code' as const,
    ref: `${MIGRATIONS_DIR}/${data.name}.cs`,
  })),
  collapsible: true,
};

export const TABLES_DATOS: readonly TableDef[] = [tablas, integridad, migraciones];
