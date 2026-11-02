/**
 * Checks shared by the tests of the final-state stop, the questions stop, the wireframes and the
 * annexes A6-A7. Test-only: like `drift/repoFiles.testing.ts`, runtime code must never import it.
 */
import { readRepoFile, repoPathExists } from '../../drift/repoFiles.testing';
import { STATUS_META, type Evidence, type Status } from '../../model/status';

/** Words the page never uses: it does not claim approval, acceptance or protection. */
export const CLAIM_PATTERNS: readonly RegExp[] = [
  /aceptado/i,
  /aprobad[oa]/i,
  /protegid[oa]/i,
  /\bsegur[oa]\b/i,
  /solo accesible/i,
];

/** Tokens that must never reach the bundle: secrets, internal names, ports and addresses. */
export const LEAK_PATTERNS: readonly RegExp[] = [
  /password(?!_hash)/i,
  /POSTGRES_/,
  /gia_user/,
  /gia_db/,
  /change_me/,
  /X-Storage-Key/i,
  /\/internal\//,
  /scanslide/i,
  /:5432/,
  /:8081/,
  /:8080/,
  /:8000/,
  /127\.0\.0\.1/,
  /localhost/i,
  /(SECRET|TOKEN)\s*[=:]\s*\S+/,
  /\.env\b/,
];

/** What a diagram of the final deployment may not name: ports, hosts, addresses, an OS. */
export const DEPLOYMENT_DENIED: readonly RegExp[] = [
  /:\d{2,5}\b/,
  /localhost/i,
  /127\.0\.0\.1/,
  /\b\d{1,3}(?:\.\d{1,3}){3}\b/,
  /https?:\/\//i,
  /\bhost(?:name)?\b/i,
  /\b(?:linux|windows|ubuntu|debian|centos|macos)\b/i,
];

/** Every string reachable from a value, depth first. */
export function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') {
    out.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value as unknown[]) collectStrings(item, out);
  } else if (value !== null && typeof value === 'object') {
    for (const item of Object.values(value)) collectStrings(item, out);
  }
  return out;
}

/** The strings of `value` that match a pattern, as "pattern: text" lines for a readable failure. */
export function matchesOf(value: unknown, patterns: readonly RegExp[]): string[] {
  const hits: string[] = [];
  for (const text of collectStrings(value)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) hits.push(`${String(pattern)}: ${text}`);
    }
  }
  return hits;
}

const PATH_KINDS: ReadonlySet<Evidence['kind']> = new Set([
  'code',
  'test',
  'contract',
  'adr',
  'doc',
  'config',
]);

/**
 * Problems in evidence references: a file that does not exist, or a line range that runs past the
 * end of the file. `git:`, `run:` and manual references are not paths and are skipped.
 */
export async function evidenceProblems(items: readonly Evidence[]): Promise<string[]> {
  const problems: string[] = [];
  for (const item of items) {
    if (!PATH_KINDS.has(item.kind)) continue;
    const parsed = /^([^:#]+)(?::(\d+)(?:-(\d+))?)?(?:#.*)?$/.exec(item.ref);
    const path = parsed?.[1];
    if (path === undefined) {
      problems.push(`Unreadable evidence reference: ${item.ref}`);
      continue;
    }
    if (!repoPathExists(path)) {
      problems.push(`Missing file: ${path}`);
      continue;
    }
    const lastLine = parsed?.[3] ?? parsed?.[2];
    if (lastLine === undefined) continue;
    try {
      const lineCount = (await readRepoFile(path)).split('\n').length;
      if (Number(lastLine) > lineCount) {
        problems.push(`${item.ref}: line ${lastLine} is past the end (${lineCount} lines)`);
      }
    } catch {
      problems.push(`${item.ref}: a line is given but the file is not readable text`);
    }
  }
  return problems;
}

// Mermaid sources -----------------------------------------------------------------------------

/** Every double-quoted label of a Mermaid source, split into the lines `<br/>` makes. */
export function labelLines(source: string): string[] {
  const lines: string[] = [];
  for (const match of source.matchAll(/"([^"]*)"/g)) {
    lines.push(...(match[1] ?? '').split('<br/>'));
  }
  return lines;
}

/** Ids of the nodes a flowchart declares with a label (`ID[...]`); subgraphs do not count. */
export function declaredNodes(source: string): string[] {
  const ids: string[] = [];
  for (const line of source.split('\n')) {
    const match = /^\s*(?!subgraph\b)([A-Za-z][A-Za-z0-9_]*)\[/.exec(line);
    if (match?.[1] !== undefined) ids.push(match[1]);
  }
  return ids;
}

const FORBIDDEN_IN_SOURCE =
  /classDef|\bstyle\b|linkStyle|\bclick\b|%%\{|<script|javascript:|href|<img|<a\b/;

/** A `class ID name` statement needs a status class and a label with its glyph naming `ID`. */
function classStatementProblems(
  lines: readonly string[],
  statement: string,
  id: string,
  name: string,
): string[] {
  if (!(name in STATUS_META)) return [`unknown class: ${name}`];
  const glyph = STATUS_META[name as Status].glyph;
  const named = new RegExp(`\\b${id}\\b`);
  const labelled = lines.some(
    (other) => other !== statement && named.test(other) && other.includes(glyph),
  );
  return labelled ? [] : [`no label with the glyph ${glyph} names ${id}`];
}

/** Rules every flowchart of the guide obeys; the list is empty when the source is clean. */
export function flowchartProblems(source: string, maxNodes = 14): string[] {
  const problems: string[] = [];
  if (!/^flowchart (?:LR|TB)\n/.test(source)) problems.push('does not start with flowchart LR|TB');
  if (FORBIDDEN_IN_SOURCE.test(source)) problems.push('contains a forbidden keyword');
  const nodes = declaredNodes(source);
  if (nodes.length > maxNodes) problems.push(`${nodes.length} nodes (maximum ${maxNodes})`);
  if (new Set(nodes).size !== nodes.length) problems.push('a node is declared twice');
  for (const line of labelLines(source)) {
    if (line.length > 40) problems.push(`label line over 40 characters: ${line}`);
  }
  const lines = source.split('\n');
  for (const line of lines) {
    if (/^\s*subgraph\b.*<br\s*\/?>/.test(line)) {
      problems.push(`<br/> in a subgraph title: ${line.trim()}`);
    }
    const statement = /^\s*class\s+(\w+)\s+(\w+)\s*$/.exec(line);
    if (statement?.[1] !== undefined && statement[2] !== undefined) {
      problems.push(...classStatementProblems(lines, line, statement[1], statement[2]));
      continue;
    }
    const mark = /:::(\w+)\s*$/.exec(line);
    if (mark?.[1] === undefined) continue;
    const status = mark[1] as Status;
    if (!(status in STATUS_META)) {
      problems.push(`unknown class: ${mark[1]}`);
      continue;
    }
    const glyph = /"(\S+)\s/.exec(line)?.[1];
    if (glyph !== STATUS_META[status].glyph) {
      problems.push(`glyph "${glyph ?? ''}" does not match class ${status}: ${line.trim()}`);
    }
  }
  return problems;
}

/** The glyph at the start of the label of node `id`, or undefined when it has none. */
export function glyphOfNode(source: string, id: string): string | undefined {
  for (const line of source.split('\n')) {
    const match = new RegExp(`^\\s*${id}\\[\\(?"(\\S+)\\s`).exec(line);
    if (match?.[1] !== undefined) return match[1];
  }
  return undefined;
}
