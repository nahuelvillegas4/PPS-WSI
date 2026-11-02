/**
 * Pure checkers behind the cross-cutting tests of the guide. Each one takes data and returns a
 * list of human-readable problems (empty when the data is fine), so `checks.test.ts` proves it
 * with synthetic good and bad inputs, independent of the real content, and the real-content tests
 * (`invariants`, `redaction`, `claims`, `evidence`, `features`, `content`) only feed them the
 * registry and the repository.
 *
 * Tests only: this folder is never imported by runtime code (the gateway image builds `web/`
 * alone). Nothing here reads files; the callers pass in what was read.
 */
import {
  STATUS_META,
  type Decision,
  type Evidence,
  type EvidenceKind,
  type Measured,
  type Status,
} from '../model/status';
import type { FeatureDef } from '../model/features';
import type {
  AdrRow,
  Block,
  Cell,
  DiagramDef,
  Requirement,
  Section,
  TableDef,
} from '../model/types';

// Walking the content -------------------------------------------------------------------------

/** A string of the content together with where it lives, for error messages. */
export interface Located {
  path: string;
  text: string;
}

function labelOf(item: unknown, index: number): string {
  if (typeof item === 'object' && item !== null && 'id' in item && typeof item.id === 'string') {
    return `id=${item.id}`;
  }
  return `${index}`;
}

/**
 * Every string reachable from `value` (object values and array items, recursively), each with a
 * readable path such as `sections[id=permisos].tabs[id=matriz].blocks[2].text`. Object keys are
 * not collected. An object reachable twice is visited once.
 */
export function collectStrings(
  value: unknown,
  path = '$',
  seen: WeakSet<object> = new WeakSet<object>(),
): Located[] {
  if (typeof value === 'string') return [{ path, text: value }];
  if (typeof value !== 'object' || value === null) return [];
  if (seen.has(value)) return [];
  seen.add(value);
  if (Array.isArray(value)) {
    const items: readonly unknown[] = value;
    return items.flatMap((item, index) =>
      collectStrings(item, `${path}[${labelOf(item, index)}]`, seen),
    );
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    collectStrings(child, `${path}.${key}`, seen),
  );
}

export interface GuideContent {
  sections: readonly Section[];
  diagrams: readonly DiagramDef[];
  tables: readonly TableDef[];
}

/** Every string the audience can read: sections, tables, diagram sources and evidence notes. */
export function contentStrings(content: GuideContent): Located[] {
  return [
    ...collectStrings(content.sections, 'sections'),
    ...collectStrings(content.diagrams, 'diagrams'),
    ...collectStrings(content.tables, 'tables'),
  ];
}

// Denylists (leaks and claims) -----------------------------------------------------------------

export interface DenyRule {
  label: string;
  pattern: RegExp;
}

function literal(text: string): RegExp {
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

/**
 * What must never reach the page: credentials, internal names, ports and the internal route. The
 * page ships in the static bundle, so anything here is public the moment it is written.
 */
export const LEAK_DENYLIST: readonly DenyRule[] = [
  { label: 'password', pattern: /password(?!_hash)/i },
  ...[
    'POSTGRES_',
    'gia_user',
    'gia_db',
    'change_me',
    'X-Storage-Key',
    'scanslide',
    ':5432',
    ':8081',
    ':8080',
    ':8000',
    '127.0.0.1',
    'localhost',
    '.env',
  ].map((term) => ({ label: term, pattern: literal(term) })),
  // The route is lowercase; case-sensitive so the folder `Controllers/Internal/` of an evidence
  // path (a file that really exists) is not mistaken for it.
  { label: '/internal/', pattern: /\/internal\// },
  { label: 'SECRET/TOKEN assignment', pattern: /(SECRET|TOKEN)\s*[=:]\s*\S+/ },
];

/** Words that promise more than the repository records (decided, approved, protected, safe). */
export const CLAIMS_DENYLIST: readonly DenyRule[] = [
  { label: 'aceptado', pattern: /aceptado/i },
  { label: 'aprobado/aprobada', pattern: /aprobad[oa]/i },
  { label: 'protegido/protegida', pattern: /protegid[oa]/i },
  { label: 'seguro/segura', pattern: /\bsegur[oa]\b/i },
  { label: 'solo accesible', pattern: /s[oó]lo accesible/i },
];

/**
 * One problem per string and rule that matches. With `showMatch` the offending fragment is part
 * of the message (fine for claims, never for leaks: a leak must not be echoed into test output).
 */
export function findDenied(
  strings: readonly Located[],
  rules: readonly DenyRule[],
  options: { showMatch?: boolean } = {},
): string[] {
  const problems: string[] = [];
  for (const { path, text } of strings) {
    for (const rule of rules) {
      const match = rule.pattern.exec(text);
      if (!match) continue;
      const shown = options.showMatch === true ? ` ("${match[0]}")` : '';
      problems.push(`${path}: contains denied term ${rule.label}${shown}`);
    }
  }
  return problems;
}

export interface EnvEntry {
  key: string;
  value: string;
}

/** Parses `KEY=value` lines of an env file; comments and blank lines are skipped. */
export function parseEnv(text: string): EnvEntry[] {
  const entries: EnvEntry[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;
    const body = line.startsWith('export ') ? line.slice('export '.length).trimStart() : line;
    const eq = body.indexOf('=');
    if (eq <= 0) continue;
    const key = body.slice(0, eq).trim();
    let value = body.slice(eq + 1).trim();
    const quote = value.charAt(0);
    const closing = quote === '"' || quote === "'" ? value.indexOf(quote, 1) : -1;
    value = closing > 0 ? value.slice(1, closing) : value.replace(/\s+#.*$/, '');
    entries.push({ key, value });
  }
  return entries;
}

/** Values of at least `minLength` characters that appear in the content; names the key only. */
export function findEnvValueLeaks(
  entries: readonly EnvEntry[],
  strings: readonly Located[],
  minLength = 6,
): string[] {
  const problems: string[] = [];
  for (const { key, value } of entries) {
    if (value.length < minLength) continue;
    for (const hit of strings) {
      if (hit.text.includes(value)) {
        problems.push(`${hit.path}: contains the value of the .env variable ${key}`);
      }
    }
  }
  return problems;
}

function approvalOf(cell: Cell): string | undefined {
  return typeof cell === 'object' && 'approval' in cell ? cell.approval : undefined;
}

function textOfCell(cell: Cell | undefined): string | undefined {
  if (typeof cell === 'string') return cell;
  if (typeof cell === 'object' && 'mono' in cell) return cell.mono;
  return undefined;
}

function allRows(table: TableDef): Record<string, Cell>[] {
  return [...table.rows, ...(table.footer ? [table.footer] : [])];
}

function rowLabel(row: Record<string, Cell>): string {
  for (const cell of Object.values(row)) {
    const text = textOfCell(cell);
    if (text !== undefined) return text.length > 40 ? `${text.slice(0, 37)}...` : text;
  }
  return '(no text)';
}

/**
 * Cells that record the supervision's approval as `REGISTRADA`. Nothing in the repository records
 * that approval, so no scope-change row may ever say it.
 */
export function findRegisteredApprovals(tables: readonly TableDef[]): string[] {
  const problems: string[] = [];
  for (const table of tables) {
    allRows(table).forEach((row, index) => {
      for (const [column, cell] of Object.entries(row)) {
        if (approvalOf(cell) === 'REGISTRADA') {
          problems.push(
            `table ${table.id}, row ${index} ("${rowLabel(row)}"), column ${column}: approval is REGISTRADA`,
          );
        }
      }
    });
  }
  return problems;
}

// Identifiers and shape of the sections ----------------------------------------------------------

/** Ids are slugs: they become DOM ids, hash fragments and test names. */
export const ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export function findDuplicates(ids: readonly string[], what: string): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) repeated.add(id);
    seen.add(id);
  }
  return [...repeated].map((id) => `duplicate ${what} id: ${id}`);
}

export function findInvalidIds(ids: readonly string[], what: string): string[] {
  return ids
    .filter((id) => !ID_PATTERN.test(id))
    .map((id) => `${what} id is not a lowercase slug: "${id}"`);
}

export const HEADLINE_MAX = 90;

/** The blocks of a section in reading order: every tab, then the presentation-hidden detail. */
export function sectionBlocks(section: Section): Block[] {
  return [...section.tabs.flatMap((tab) => tab.blocks), ...(section.detail ?? [])];
}

/** Headline length, speaker notes, tabs, footnotes and minutes of one section. */
export function checkSectionShape(section: Section): string[] {
  const where = `section ${section.id}`;
  const problems: string[] = [];
  if (section.title.trim() === '') problems.push(`${where}: empty title`);
  if (section.headline.trim() === '') problems.push(`${where}: empty headline`);
  if (section.headline.length > HEADLINE_MAX) {
    problems.push(
      `${where}: headline has ${section.headline.length} characters (at most ${HEADLINE_MAX})`,
    );
  }
  if (section.notes.length < 2 || section.notes.length > 4) {
    problems.push(`${where}: has ${section.notes.length} speaker notes (expected 2 to 4)`);
  }
  if (section.notes.some((note) => note.trim() === '')) {
    problems.push(`${where}: has an empty speaker note`);
  }
  if (section.tabs.length === 0) problems.push(`${where}: has no tabs`);
  problems.push(
    ...findDuplicates(
      section.tabs.map((tab) => tab.id),
      `tab of ${section.id}`,
    ),
  );
  problems.push(
    ...findInvalidIds(
      section.tabs.map((tab) => tab.id),
      `tab of ${section.id}`,
    ),
  );
  for (const tab of section.tabs) {
    if (tab.label.trim() === '') problems.push(`${where}, tab ${tab.id}: empty label`);
    if (tab.blocks.length === 0) problems.push(`${where}, tab ${tab.id}: has no blocks`);
  }
  problems.push(
    ...findDuplicates(
      (section.footnotes ?? []).map((note) => note.id),
      `footnote of ${section.id}`,
    ),
  );
  if (section.group === 'recorrido') {
    if (section.minutes === undefined || !(section.minutes > 0)) {
      problems.push(`${where}: a stop of the walk-through needs minutes greater than 0`);
    }
  } else if (section.minutes !== undefined) {
    problems.push(`${where}: an annex has no minutes in the talk`);
  }
  return problems;
}

/** The minutes of the walk-through stops add up to a talk that fits the meeting. */
export function checkWalkthroughMinutes(
  sections: readonly Section[],
  min = 18,
  max = 24,
): string[] {
  const total = sections
    .filter((section) => section.group === 'recorrido')
    .reduce((sum, section) => sum + (section.minutes ?? 0), 0);
  return total < min || total > max
    ? [`the walk-through lasts ${total} minutes (expected between ${min} and ${max})`]
    : [];
}

// Block references -------------------------------------------------------------------------------

export interface BlockRefs {
  /** Diagram id to the ids of the sections that show it, one entry per block. */
  diagrams: Map<string, string[]>;
  tables: Map<string, string[]>;
}

function pushTo(map: Map<string, string[]>, key: string, value: string): void {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

export function collectBlockRefs(sections: readonly Section[]): BlockRefs {
  const refs: BlockRefs = { diagrams: new Map(), tables: new Map() };
  for (const section of sections) {
    for (const block of sectionBlocks(section)) {
      if (block.kind === 'diagram') pushTo(refs.diagrams, block.id, section.id);
      else if (block.kind === 'table') pushTo(refs.tables, block.id, section.id);
    }
  }
  return refs;
}

/** Tables the guide shows in two places on purpose: defined once, referenced twice. */
export const TABLES_SHOWN_TWICE: readonly string[] = ['pantallas', 'qs'];

/**
 * Every referenced diagram and table exists, each diagram is shown by exactly one block, each
 * table by at least one; only `tablesShownTwice` may be shown more than once, and exactly twice.
 */
export function checkBlockReferences(
  sections: readonly Section[],
  diagramIds: Iterable<string>,
  tableIds: Iterable<string>,
  tablesShownTwice: readonly string[] = TABLES_SHOWN_TWICE,
): string[] {
  const knownDiagrams = new Set(diagramIds);
  const knownTables = new Set(tableIds);
  const refs = collectBlockRefs(sections);
  const problems: string[] = [];

  for (const [id, where] of refs.diagrams) {
    if (!knownDiagrams.has(id)) {
      problems.push(`unknown diagram ${id} referenced by section ${where.join(', ')}`);
    }
  }
  for (const [id, where] of refs.tables) {
    if (!knownTables.has(id)) {
      problems.push(`unknown table ${id} referenced by section ${where.join(', ')}`);
    }
  }
  for (const id of knownDiagrams) {
    const where = refs.diagrams.get(id) ?? [];
    if (where.length === 0) problems.push(`diagram ${id} is not referenced by any block`);
    else if (where.length > 1) {
      problems.push(
        `diagram ${id} is referenced ${where.length} times (${where.join(', ')}); it must appear exactly once`,
      );
    }
  }
  for (const id of knownTables) {
    const where = refs.tables.get(id) ?? [];
    if (where.length === 0) {
      problems.push(`table ${id} is not referenced by any block`);
    } else if (tablesShownTwice.includes(id)) {
      if (where.length !== 2) {
        problems.push(
          `table ${id} must appear exactly twice, found ${where.length} (${where.join(', ')})`,
        );
      }
    } else if (where.length > 1) {
      problems.push(
        `table ${id} is referenced ${where.length} times (${where.join(', ')}); only ${tablesShownTwice.join(' and ')} may repeat`,
      );
    }
  }
  return problems;
}

// Status rules (design section 5) -----------------------------------------------------------------

/** Evidence kinds that can prove something is built. `manual`, `doc`, `adr` and `git` cannot. */
export const PROOF_KINDS: readonly EvidenceKind[] = ['code', 'test', 'contract', 'config', 'run'];

/** Kinds whose `ref` is a repository path. */
export const PATH_EVIDENCE_KINDS: readonly EvidenceKind[] = [
  'code',
  'test',
  'contract',
  'adr',
  'doc',
  'config',
];

const RUN_REF = /^run:(\d{4}-\d{2}-\d{2}) \S/;
const GIT_REF = /^git:[0-9a-f]{7,40}$/;
/** A 7 to 40 character hex token with at least one digit, so ordinary words do not pass. */
const COMMIT = /\b(?=[0-9a-f]*\d)[0-9a-f]{7,40}\b/;

/** `path[:line[-line]][#symbol]` to `path`. */
export function stripEvidenceRef(ref: string): string {
  return ref.replace(/#.*$/, '').replace(/:\d+(?:-\d+)?$/, '');
}

/** `run` evidence is a dated execution: the ref carries the date, the ref or note the commit. */
function runEvidenceProblems(evidence: Evidence): string[] {
  const problems: string[] = [];
  const match = RUN_REF.exec(evidence.ref);
  if (!match) problems.push(`run evidence "${evidence.ref}" must read "run:<YYYY-MM-DD> <what>"`);
  else if (parseIsoDate(match[1] ?? '') === undefined) {
    problems.push(`run evidence "${evidence.ref}" has an invalid date`);
  }
  if (!COMMIT.test(`${evidence.ref} ${evidence.note ?? ''}`)) {
    problems.push(`run evidence "${evidence.ref}" names no commit (put it in the ref or the note)`);
  }
  return problems;
}

/** Format of one evidence entry, without touching the repository. */
export function evidenceFormatProblems(evidence: Evidence): string[] {
  switch (evidence.kind) {
    case 'git':
      return GIT_REF.test(evidence.ref)
        ? []
        : [`git evidence "${evidence.ref}" must read "git:<sha>" (7 to 40 hex characters)`];
    case 'run':
      return runEvidenceProblems(evidence);
    case 'manual':
      return evidence.ref.trim() === '' ? ['manual evidence has an empty ref'] : [];
    default: {
      const path = stripEvidenceRef(evidence.ref);
      if (path.trim() === '') return [`${evidence.kind} evidence has an empty ref`];
      // Spaces and parentheses are fine: real files have them ("Enunciado (1).pdf").
      if (path.includes('\\') || path.startsWith('/') || /^[A-Za-z]:/.test(path)) {
        return [`${evidence.kind} evidence "${evidence.ref}" must be a repo-relative path with /`];
      }
      if (path.split('/').includes('..')) {
        return [`${evidence.kind} evidence "${evidence.ref}" must not leave the repository`];
      }
      return [];
    }
  }
}

/** True when the entries include real proof: manual-only (or doc-only) evidence never counts. */
export function hasBuiltProof(sources: readonly Evidence[]): boolean {
  return sources.some(
    (evidence) =>
      PROOF_KINDS.includes(evidence.kind) &&
      (evidence.kind !== 'run' || runEvidenceProblems(evidence).length === 0),
  );
}

function cellStatuses(cell: Cell): Status[] {
  if (typeof cell !== 'object') return [];
  if ('status' in cell) return [cell.status];
  if ('chips' in cell) return cell.chips.map((chip) => chip.status);
  return [];
}

function isBuilt(status: Status): boolean {
  return status === 'done' || status === 'partial';
}

export function tableShowsBuilt(table: TableDef): boolean {
  return allRows(table).some((row) =>
    Object.values(row).some((cell) => cellStatuses(cell).some(isBuilt)),
  );
}

export function diagramShowsBuilt(diagram: DiagramDef): boolean {
  return (
    diagram.usesStatus &&
    (diagram.source.includes(STATUS_META.done.glyph) ||
      diagram.source.includes(STATUS_META.partial.glyph))
  );
}

/** Whatever shows an item as done or partial must cite code, test, contract, config or run proof. */
export function checkBuiltClaimsHaveProof(
  tables: readonly TableDef[],
  diagrams: readonly DiagramDef[],
): string[] {
  const problems: string[] = [];
  const reason =
    'shows done or partial items but cites no code, test, contract, config or valid run evidence (manual, doc, adr and git evidence do not prove it)';
  for (const table of tables) {
    if (tableShowsBuilt(table) && !hasBuiltProof(table.sources)) {
      problems.push(`table ${table.id} ${reason}`);
    }
  }
  for (const diagram of diagrams) {
    if (diagramShowsBuilt(diagram) && !hasBuiltProof(diagram.sources)) {
      problems.push(`diagram ${diagram.id} ${reason}`);
    }
  }
  return problems;
}

/** Stepper steps that are not fully built must say what is missing. */
export function checkStepperNotes(sections: readonly Section[]): string[] {
  const problems: string[] = [];
  for (const section of sections) {
    for (const block of sectionBlocks(section)) {
      if (block.kind !== 'stepper') continue;
      for (const step of block.steps) {
        if ((step.api !== 'done' || step.web !== 'done') && (step.note ?? '').trim() === '') {
          problems.push(
            `section ${section.id}, step ${step.id}: not fully done (api ${step.api}, web ${step.web}) but has no note with the gap`,
          );
        }
      }
    }
  }
  return problems;
}

/** Tripwire items that are not done carry a gap sentence and at least one tripwire. */
export function checkFeatureDefinitions(features: Readonly<Record<string, FeatureDef>>): string[] {
  const problems: string[] = [];
  for (const [id, def] of Object.entries(features)) {
    if (def.label.trim() === '') problems.push(`feature ${id}: empty label`);
    if (def.status === 'done') continue;
    if (def.gap.trim() === '')
      problems.push(`feature ${id}: status ${def.status} but no gap sentence`);
    const paths = def.absentPaths ?? [];
    if (paths.length === 0 && def.absentText === undefined) {
      problems.push(
        `feature ${id}: status ${def.status} but no tripwire (absentPaths or absentText)`,
      );
    }
    if (paths.some((glob) => glob.trim() === ''))
      problems.push(`feature ${id}: empty glob in absentPaths`);
    if (def.absentText) {
      if (def.absentText.in.length === 0)
        problems.push(`feature ${id}: absentText searches no files`);
      try {
        new RegExp(def.absentText.pattern);
      } catch {
        problems.push(`feature ${id}: absentText pattern is not a valid regular expression`);
      }
    }
  }
  return problems;
}

/** What the tripwires need from the repository; the real one is `drift/repoFiles.testing.ts`. */
export interface RepoProbe {
  matchGlob(glob: string): readonly string[];
  findText(query: NonNullable<FeatureDef['absentText']>): Promise<readonly string[]>;
}

/** Repository files that prove a planned item already exists (empty while it is still absent). */
export async function tripwireHits(def: FeatureDef, probe: RepoProbe): Promise<string[]> {
  const hits = (def.absentPaths ?? []).flatMap((glob) => probe.matchGlob(glob));
  if (def.absentText) hits.push(...(await probe.findText(def.absentText)));
  return [...new Set(hits)];
}

/** The message a tripped wire shows: it says which entry to update. */
export function tripwireMessage(label: string): string {
  return `El ítem ${label} figura como planificado en /gia pero ya existe: actualizá model/features.ts y el contenido`;
}

export function tripwireProblems(
  def: Pick<FeatureDef, 'label'>,
  hits: readonly string[],
): string[] {
  return hits.length > 0 ? [tripwireMessage(def.label)] : [];
}

/** Requirements: evidence for the built ones, a gap theme for the rest. */
export function checkRequirements(requirements: readonly Requirement[]): string[] {
  const problems = findDuplicates(
    requirements.map((req) => req.id),
    'requirement',
  );
  for (const req of requirements) {
    const where = `requirement ${req.id}`;
    if (req.text.trim() === '') problems.push(`${where}: empty text`);
    if ((req.state === 'implemented' || req.state === 'partial') && req.evidence.trim() === '') {
      problems.push(`${where}: state ${req.state} but no evidence`);
    }
    if (req.state !== 'implemented' && req.theme === undefined) {
      problems.push(`${where}: state ${req.state} but no gap theme`);
    }
  }
  return problems;
}

/** ADRs the repository records as `PROPUESTO`; the page must never say more. */
export const PROPOSED_ADRS: readonly number[] = [7, 8, 9, 10, 15, 16, 17];

const ADR_INDEX_ROW = /^\|\s*\[ADR-(\d+)\]\([^)]*\)\s*\|[^|]*\|\s*`(DECIDIDO|PROPUESTO|PENDIENTE)`/;

/** Decision of each ADR as listed in the table of `docs/adr/README.md`. */
export function parseAdrIndex(markdown: string): Map<number, Decision> {
  const index = new Map<number, Decision>();
  for (const line of markdown.split(/\r?\n/)) {
    const match = ADR_INDEX_ROW.exec(line);
    if (!match) continue;
    const decision = match[2];
    if (decision === 'DECIDIDO' || decision === 'PROPUESTO' || decision === 'PENDIENTE') {
      index.set(Number(match[1]), decision);
    }
  }
  return index;
}

const ACCEPTED_WORDS = /aceptado|aprobad[oa]/i;

/** The ADR rows against the ADR index, the proposed ADRs in particular. */
export function checkAdrs(rows: readonly AdrRow[], index: ReadonlyMap<number, Decision>): string[] {
  const problems = findDuplicates(
    rows.map((row) => `ADR-${row.n}`),
    'ADR row',
  );
  for (const row of rows) {
    const where = `ADR-${row.n}`;
    const indexed = index.get(row.n);
    if (indexed === undefined) problems.push(`${where}: not listed in docs/adr/README.md`);
    else if (indexed !== row.decision) {
      problems.push(`${where}: the page says ${row.decision}, docs/adr/README.md says ${indexed}`);
    }
    if (row.title.trim() === '' || row.sentence.trim() === '') {
      problems.push(`${where}: empty title or sentence`);
    }
    if (row.inCode === 'partial' && (row.pending ?? '').trim() === '') {
      problems.push(`${where}: only partly in code but no pending sentence`);
    }
  }
  for (const n of PROPOSED_ADRS) {
    const where = `ADR-${n}`;
    const row = rows.find((candidate) => candidate.n === n);
    if (!row) {
      problems.push(`${where}: missing from the ADR data of the page`);
      continue;
    }
    if (row.decision !== 'PROPUESTO') {
      problems.push(`${where}: must be PROPUESTO on the page, found ${row.decision}`);
    }
    if (index.get(n) !== 'PROPUESTO') {
      problems.push(
        `${where}: docs/adr/README.md no longer lists it as PROPUESTO; if the supervision decided, update PROPOSED_ADRS in drift/checks.ts`,
      );
    }
    const prose = [row.title, row.qualifier, row.sentence, row.pending];
    if (prose.some((text) => text !== undefined && ACCEPTED_WORDS.test(text))) {
      problems.push(
        `${where}: its text says aceptado or aprobado/aprobada, but it is only proposed`,
      );
    }
  }
  return problems;
}

/** Table rows identified by an exact ADR id cell ("ADR-15") must show the decision of the index. */
export function checkAdrTableRows(
  tables: readonly TableDef[],
  index: ReadonlyMap<number, Decision>,
): string[] {
  const problems: string[] = [];
  for (const table of tables) {
    allRows(table).forEach((row, position) => {
      const cells = Object.values(row);
      const idMatch = cells
        .map((cell) => /^ADR-0*(\d+)$/i.exec(textOfCell(cell) ?? ''))
        .find((match) => match !== null);
      if (!idMatch) return;
      const n = Number(idMatch[1]);
      for (const cell of cells) {
        if (typeof cell === 'object' && 'decision' in cell && cell.decision !== index.get(n)) {
          problems.push(
            `table ${table.id}, row ${position}: ADR-${n} shows ${cell.decision}, docs/adr/README.md says ${index.get(n) ?? 'nothing'}`,
          );
        }
      }
    });
  }
  return problems;
}

/** Measured numbers carry value, date, commit and method, and are not newer than the snapshot. */
export function checkMeasured(
  measured: Readonly<Record<string, Measured>>,
  snapshotDate: string,
): string[] {
  const problems: string[] = [];
  const snapshot = parseIsoDate(snapshotDate);
  for (const [key, item] of Object.entries(measured)) {
    const where = `measured ${key}`;
    if (typeof item.value === 'string' && item.value.trim() === '')
      problems.push(`${where}: empty value`);
    if (typeof item.value === 'number' && !Number.isFinite(item.value)) {
      problems.push(`${where}: value is not a finite number`);
    }
    const asOf = parseIsoDate(item.asOf);
    if (asOf === undefined) problems.push(`${where}: asOf "${item.asOf}" is not a YYYY-MM-DD date`);
    else if (snapshot !== undefined && asOf > snapshot) {
      problems.push(`${where}: measured on ${item.asOf}, after the snapshot of ${snapshotDate}`);
    }
    if (!/^[0-9a-f]{7,40}$/.test(item.commit)) problems.push(`${where}: commit is not a sha`);
    if (item.method.trim() === '') problems.push(`${where}: empty method`);
  }
  return problems;
}

// Evidence exists ----------------------------------------------------------------------------------

export interface LocatedEvidence {
  where: string;
  evidence: Evidence;
}

/** Every `sources` entry of the diagrams and the tables. */
export function collectEvidence(
  diagrams: readonly DiagramDef[],
  tables: readonly TableDef[],
): LocatedEvidence[] {
  return [
    ...diagrams.flatMap((diagram) =>
      diagram.sources.map((evidence) => ({ where: `diagram ${diagram.id}`, evidence })),
    ),
    ...tables.flatMap((table) =>
      table.sources.map((evidence) => ({ where: `table ${table.id}`, evidence })),
    ),
  ];
}

/**
 * Format of every entry and, for path-like kinds, existence through `exists` (given the path with
 * `:line` and `#symbol` stripped). `git` and `run` refs are checked for format only.
 */
export function findEvidenceProblems(
  items: readonly LocatedEvidence[],
  exists: (path: string) => boolean,
): string[] {
  const problems: string[] = [];
  for (const { where, evidence } of items) {
    const format = evidenceFormatProblems(evidence);
    problems.push(...format.map((problem) => `${where}: ${problem}`));
    if (format.length > 0 || !PATH_EVIDENCE_KINDS.includes(evidence.kind)) continue;
    if (!exists(stripEvidenceRef(evidence.ref))) {
      problems.push(
        `${where}: ${evidence.kind} evidence ${evidence.ref} does not exist in the repository`,
      );
    }
  }
  return problems;
}

// Dates and visible staleness ------------------------------------------------------------------------

const MS_PER_DAY = 86_400_000;

/** Days since the epoch of a `YYYY-MM-DD` calendar date, or `undefined` when it is not one. */
export function parseIsoDate(text: string): number | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const ms = Date.UTC(year, month - 1, day);
  const back = new Date(ms);
  if (
    back.getUTCFullYear() !== year ||
    back.getUTCMonth() !== month - 1 ||
    back.getUTCDate() !== day
  ) {
    return undefined;
  }
  return ms / MS_PER_DAY;
}

/** `2026-11-02` to `02/11/2026`, the label the page shows. */
export function formatSnapshotLabel(isoDate: string): string | undefined {
  if (parseIsoDate(isoDate) === undefined) return undefined;
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

/** Banner threshold: the facts of the page were last checked more than this many days ago. */
export const STALE_AFTER_DAYS = 14;

/**
 * True when `snapshotDate` is more than `maxAgeDays` days older than `today` (both
 * `YYYY-MM-DD`). A date that cannot be read counts as stale: the banner must err on showing.
 * A snapshot in the future is not stale.
 */
export function isSnapshotStale(
  snapshotDate: string,
  today: string,
  maxAgeDays = STALE_AFTER_DAYS,
): boolean {
  const snapshot = parseIsoDate(snapshotDate);
  const now = parseIsoDate(today);
  if (snapshot === undefined || now === undefined) return true;
  return now - snapshot > maxAgeDays;
}
