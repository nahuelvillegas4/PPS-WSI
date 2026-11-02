/** Typed content model of the guide page: stops are data, a few generic components render them. */
import type { Approval, Decision, Evidence, ReqState, Status } from './status';

export interface StepDef {
  id: string;
  title: string;
  api: Status;
  web: Status;
  note?: string;
}

/** Display names for a status in singular and plural, used when the default noun misleads. */
export type StatusLabels = Partial<Record<Status, { singular: string; plural: string }>>;

/** One renderable piece of a tab. Diagrams and tables are referenced by id (see `registry.ts`). */
export type Block =
  | { kind: 'diagram'; id: string }
  | { kind: 'table'; id: string }
  | { kind: 'callout'; tone: 'info' | 'warning' | 'honest'; title?: string; text: string }
  | { kind: 'stats'; items: readonly { value: string; label: string; status?: Status }[] }
  | { kind: 'stepper'; steps: readonly StepDef[] }
  | {
      kind: 'waffle';
      groups: readonly { label: string; cells: readonly { status: Status; title: string }[] }[];
      /** Overrides how a status is named in captions and the legend (for example `planned` as "pendiente"). */
      statusLabels?: StatusLabels;
    }
  | {
      kind: 'bars';
      rows: readonly { label: string; segments: readonly { status: Status; value: number }[] }[];
      /** Same override as in the waffle. */
      statusLabels?: StatusLabels;
    }
  | {
      kind: 'quadrants';
      cells: readonly {
        decision: Decision;
        realised: 'realizado' | 'parcial';
        items: readonly string[];
      }[];
    }
  | {
      kind: 'cards';
      items: readonly { title: string; body: string; status?: Status; chips?: readonly string[] }[];
    }
  | { kind: 'list'; items: readonly string[] }
  | { kind: 'wireframe'; id: 'editor' | 'import' | 'export' | 'classes' }
  | { kind: 'live'; id: 'tile-mode' }
  | { kind: 'liveLink'; target: 'catalog' | 'users'; label: string };

export interface Tab {
  id: string;
  label: string;
  blocks: readonly Block[];
}

export interface Section {
  id: string;
  group: 'recorrido' | 'anexo';
  title: string;
  /** Projected headline, at most 90 characters. */
  headline: string;
  /** Minutes in the talk; only stops of the walk-through have them. */
  minutes?: number;
  tabs: readonly Tab[];
  /** Speaker notes, 2 to 4 lines; the first one is the talking point. */
  notes: readonly string[];
  /** Extra blocks hidden in presentation mode. */
  detail?: readonly Block[];
  footnotes?: readonly { id: string; text: string }[];
}

export interface DiagramDef {
  id: string;
  kind: 'flowchart' | 'sequence' | 'er' | 'state' | 'gantt';
  title: string;
  /** Plain-language description, used as the accessible name of the figure. */
  summary: string;
  caption?: string;
  /** Mermaid source. Authors write `:::done`-style classes and glyphs, never `classDef`. */
  source: string;
  /** True when the source uses the status classes, so the engine appends their `classDef` block. */
  usesStatus: boolean;
  sources: readonly Evidence[];
  priority: 'P0' | 'P1' | 'P2';
}

export type Cell =
  | string
  | number
  | { status: Status; text?: string }
  | { decision: Decision }
  | { approval: Approval }
  | { chips: readonly { label: string; status: Status }[] }
  | { mono: string }
  | { yes: boolean | 'partial' | 'own' };

export interface ColumnDef {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  filterable?: boolean;
}

export interface TableDef {
  id: string;
  title: string;
  caption?: string;
  columns: readonly ColumnDef[];
  rows: readonly Record<string, Cell>[];
  footer?: Record<string, Cell>;
  sources: readonly Evidence[];
  collapsible?: boolean;
}

/** What a stop or an annex module exports: its section plus the diagrams and tables it owns. */
export interface StopContent {
  section: Section;
  diagrams: readonly DiagramDef[];
  tables: readonly TableDef[];
}

// Shared datasets (each one has a single owner unit) -----------------------------------------

/** Lowest caller that may run an operation; the `minimum` column of the authorization matrix. */
export type Minimum =
  'anonymous' | 'any-authenticated' | 'viewer' | 'annotator' | 'project-admin' | 'global-admin';

export type PermissionKey =
  | 'project.view'
  | 'annotation.write'
  | 'catalog.manage'
  | 'image.upload'
  | 'member.manage'
  | 'dataset.export';

/** The six `scope` values of the fixture. */
export type ScopeKind = 'none' | 'project' | 'dataset' | 'class' | 'image' | 'annotation';

/** Area `images` = storage listing + image operations (5); `io` = import + export (2). */
export type ApiArea =
  | 'auth'
  | 'users'
  | 'projects'
  | 'members'
  | 'datasets'
  | 'classes'
  | 'images'
  | 'annotations'
  | 'io'
  | 'internal'
  | 'health';

export interface ApiOperation {
  id: string;
  method: string;
  path: string;
  area: ApiArea;
  minimum: Minimum;
  permission: PermissionKey | null;
  scope: ScopeKind;
  nonMember: 403 | 404 | null;
  ownerOnly?: true;
  manualGate?: true;
  /** True when the SPA calls it today. */
  inSpa: boolean;
  pending?: string;
}

export type GapTheme =
  | 'editor'
  | 'pantallas'
  | 'servidor'
  | 'ci-calidad'
  | 'informe'
  | 'datos-de-prueba'
  | 'alcance'
  | 'documentacion';

export interface Requirement {
  id: string;
  pps: 1 | 2;
  text: string;
  state: ReqState;
  evidence: string;
  /** Mandatory when the requirement is not `implemented`. */
  theme?: GapTheme;
}

export interface AdrRow {
  n: number;
  title: string;
  decision: Decision;
  qualifier?: string;
  inCode: 'done' | 'partial';
  sentence: string;
  pending?: string;
}
