import { c, g } from '../../model/diagramKit';
import { FACTS } from '../../model/facts';
import { STATUS_META } from '../../model/status';
import type { DiagramDef } from '../../model/types';

/**
 * Words the target model prints next to what does not exist yet (ER diagrams have no dashes).
 * The extensions are not "planned": both statements leave them out of scope and the architecture
 * only keeps a place for them (section 5.4), so they carry the undecided glyph and this wording.
 */
const EXTENSION = 'extensión prevista';
const UNDECIDED = STATUS_META.unknown.label.toUpperCase();

/**
 * The persistence model as migrated. Every relationship is one foreign key of the model snapshot
 * (the test counts them), labelled with its ON DELETE rule.
 */
const ER_IMPLEMENTADO = `erDiagram
  USERS ||--o{ PROJECT_MEMBERS : "user_id RESTRICT"
  USERS |o--o{ PROJECT_MEMBERS : "granted_by_user_id RESTRICT"
  USERS ||--o{ ANNOTATIONS : "author_id RESTRICT"
  USERS ||--o{ IMPORTS : "imported_by_id RESTRICT"
  PROJECTS ||--o{ PROJECT_MEMBERS : "project_id CASCADE"
  PROJECTS ||--o{ DATASETS : "project_id RESTRICT"
  DATASETS ||--o{ LABEL_CLASSES : "dataset_id RESTRICT"
  DATASETS ||--o{ IMAGES : "dataset_id RESTRICT"
  DATASETS ||--o{ ANNOTATIONS : "dataset_id CASCADE"
  DATASETS ||--o{ IMPORTS : "dataset_id RESTRICT"
  IMAGES ||--o{ ANNOTATIONS : "dataset_id e image_id RESTRICT"
  LABEL_CLASSES ||--o{ ANNOTATIONS : "dataset_id y class_id RESTRICT"
  USERS {
    bigint id PK
    varchar username UK
    text password_hash
    varchar role "CHECK admin o user"
    bool is_active
    bool is_system "usuario sintético"
    timestamptz created_at
  }
  PROJECTS {
    bigint id PK
    varchar name UK
    text description "puede ser nula"
    timestamptz created_at
  }
  PROJECT_MEMBERS {
    bigint project_id PK, FK
    bigint user_id PK, FK
    varchar role "CHECK viewer, annotator, project-admin"
    bigint granted_by_user_id FK "puede ser nula"
    timestamptz created_at
    timestamptz updated_at
  }
  DATASETS {
    bigint id PK
    bigint project_id FK
    varchar name "único por proyecto solo en código"
    text description "puede ser nula"
    timestamptz created_at
  }
  LABEL_CLASSES {
    bigint id PK "AK con dataset_id"
    bigint dataset_id FK
    varchar name "único por dataset solo en código"
    varchar color "7 caracteres"
    int display_order
  }
  IMAGES {
    bigint id PK "AK con dataset_id"
    bigint dataset_id FK
    varchar storage_key UK "único con dataset_id"
    varchar kind "wsi o conventional"
    varchar format "svs, png o jpeg"
    int width_l0
    int level_count
  }
  ANNOTATIONS {
    bigint id PK
    bigint dataset_id FK
    bigint image_id FK
    bigint class_id FK
    bigint author_id FK
    jsonb geometry_json "píxeles de nivel 0"
    timestamptz deleted_at "borrado lógico"
  }
  IMPORTS {
    bigint id PK
    bigint dataset_id FK
    bigint imported_by_id FK
    varchar format "solo cric"
    varchar source
    timestamptz imported_at
    jsonb report_json
  }`;

/**
 * The ADR-07 model is migrated whole, so the target is the same eight tables plus extensions that
 * are out of scope and have no schedule. They carry the colour of the undecided status, its glyph
 * and the words "extensión prevista"; none is called planned.
 */
const ER_OBJETIVO = `erDiagram
  USERS ||--o{ PROJECT_MEMBERS : "membresía"
  PROJECTS ||--o{ PROJECT_MEMBERS : "tiene"
  PROJECTS ||--o{ DATASETS : "contiene"
  DATASETS ||--o{ LABEL_CLASSES : "define"
  DATASETS ||--o{ IMAGES : "registra"
  DATASETS ||--o{ IMPORTS : "reporte"
  IMAGES ||--o{ ANNOTATIONS : "tiene"
  LABEL_CLASSES ||--o{ ANNOTATIONS : "clasifica"
  USERS ||--o{ ANNOTATIONS : "es autor"
  USERS ||--o{ IMPORTS : "importa"
  ANNOTATIONS ||--o{ ANNOTATION_REVISIONS : "historial: ${EXTENSION}"
  IMAGES ||--o| IMAGE_REVIEW_STATE : "revisión: ${EXTENSION}"
  USERS {
    bigint id PK
    varchar username UK
    varchar role "admin o user"
    bool is_system
    int session_version "${g('unknown')} ${UNDECIDED}: ADR-16 abierto"
  }
  PROJECTS {
    bigint id PK
    varchar name UK
  }
  PROJECT_MEMBERS {
    bigint project_id PK, FK
    bigint user_id PK, FK
    varchar role "viewer, annotator, project-admin"
  }
  DATASETS {
    bigint id PK
    bigint project_id FK
    varchar name
  }
  LABEL_CLASSES {
    bigint id PK
    bigint dataset_id FK
    varchar name
    varchar color
  }
  IMAGES {
    bigint id PK
    bigint dataset_id FK
    varchar storage_key UK
    varchar kind
    varchar format "valor dicom: ${EXTENSION}"
  }
  ANNOTATIONS {
    bigint id PK
    bigint dataset_id FK
    bigint image_id FK
    bigint class_id FK
    bigint author_id FK
    jsonb geometry_json
    varchar source "valor model: ${EXTENSION}"
    timestamptz deleted_at
  }
  IMPORTS {
    bigint id PK
    bigint dataset_id FK
    bigint imported_by_id FK
  }
  ANNOTATION_REVISIONS["${g('unknown')} annotation_revisions · extensión"]${c('unknown')} {
    bigint id PK "no migrada, fuera de alcance"
    bigint annotation_id FK "${g('unknown')} columnas ${UNDECIDED}"
  }
  IMAGE_REVIEW_STATE["${g('unknown')} image_review_state · extensión"]${c('unknown')} {
    bigint image_id PK, FK "${g('unknown')} columnas ${UNDECIDED}"
  }`;

export const DIAGRAMS_DATOS: readonly DiagramDef[] = [
  {
    id: 'er-implementado',
    kind: 'er',
    title: 'Modelo implementado',
    summary: `Diagrama entidad-relación de las ${FACTS.tables} tablas de la base de datos y de las claves foráneas que las unen, con la regla de borrado de cada una.`,
    caption:
      'RESTRICT bloquea el borrado del padre; CASCADE borra los hijos y solo se usa de proyecto a miembros y de dataset a anotaciones.',
    source: ER_IMPLEMENTADO,
    usesStatus: false,
    sources: [
      {
        kind: 'code',
        ref: 'api/src/Pps.Infrastructure/Persistence/Migrations/AppDbContextModelSnapshot.cs',
      },
      { kind: 'code', ref: 'api/src/Pps.Infrastructure/Persistence/AppDbContext.cs' },
      { kind: 'adr', ref: 'docs/adr/0007-modelo-de-datos-y-autoria.md' },
      { kind: 'adr', ref: 'docs/adr/0015-roles-por-proyecto-y-membresia.md' },
    ],
    priority: 'P0',
  },
  {
    id: 'er-objetivo',
    kind: 'er',
    title: 'Modelo objetivo',
    summary:
      'Diagrama entidad-relación del modelo con las extensiones previstas: las mismas tablas de hoy más dos tablas de extensión y dos valores nuevos, fuera del alcance de las dos PPS, y un atributo de sesión sin decidir. Ninguna se construye en esta etapa.',
    caption:
      'Extensiones previstas en la arquitectura, fuera de alcance y sin cronograma: ninguna se construye en esta etapa. Los nombres de las dos tablas nuevas son provisionales y sus columnas están sin decidir.',
    source: ER_OBJETIVO,
    usesStatus: true,
    sources: [
      {
        kind: 'doc',
        ref: 'docs/arquitectura/03-bloques-y-ejecucion.md:146-158',
        note: 'puntos de extensión',
      },
      {
        kind: 'doc',
        ref: 'docs/arquitectura/01-introduccion-y-restricciones.md:28',
        note: 'fuera de alcance',
      },
      { kind: 'adr', ref: 'docs/adr/0007-modelo-de-datos-y-autoria.md' },
      { kind: 'adr', ref: 'docs/adr/0016-autorizacion-por-proyecto-y-sesion.md' },
    ],
    priority: 'P1',
  },
];
