/**
 * Test-only helpers shared by the tests of the architecture and flows stops: shape budgets of a
 * Mermaid source, evidence lookup and the strings a rendered stop must never contain. Never
 * imported by runtime code.
 */
import { repoPathExists } from '../../drift/repoFiles.testing';
import { STATUS_META, type Evidence } from '../../model/status';
import type { Block, DiagramDef, Section } from '../../model/types';

export const MAX_LABEL_LINE = 40;

const characters = (text: string): number => Array.from(text).length;

function splitBreaks(text: string): string[] {
  return text.split('<br/>').map((part) => part.trim());
}

/** Every text a reader sees in a diagram, one entry per displayed line. */
export function visibleLines(diagram: DiagramDef): string[] {
  const lines: string[] = [];
  const add = (text: string | undefined): void => {
    if (text !== undefined) lines.push(...splitBreaks(text));
  };

  if (diagram.kind === 'flowchart') {
    for (const match of diagram.source.matchAll(/"([^"]*)"/g)) add(match[1]);
    return lines;
  }

  let inNoteBlock = false;
  for (const raw of diagram.source.split('\n')) {
    const line = raw.trim();
    if (inNoteBlock) {
      if (/^end note$/i.test(line)) inNoteBlock = false;
      else add(line);
      continue;
    }
    if (/^note\s/i.test(line) && !line.includes(':')) {
      inNoteBlock = true;
      continue;
    }
    for (const match of line.matchAll(/"([^"]*)"/g)) add(match[1]);
    const alias = /^(?:participant|actor)\s+\S+\s+as\s+(.+)$/.exec(line);
    if (alias) add(alias[1]);
    const frame = /^(?:alt|else|opt|loop|par|and)\s+(.+)$/.exec(line);
    if (frame) add(frame[1]);
    // `Note over A: text`, `A->>B: text`, `a --> b: text`: the text after the first colon.
    const afterColon = /^[^:"]+?:\s*(.+)$/.exec(line);
    if (afterColon && !line.includes(':::')) add(afterColon[1]);
  }
  return lines;
}

/** Displayed lines longer than the budget of a label line. */
export function longLines(diagram: DiagramDef): string[] {
  return visibleLines(diagram).filter((text) => characters(text) > MAX_LABEL_LINE);
}

/** Distinct node ids of a flowchart source. */
export function flowchartNodeIds(source: string): Set<string> {
  const ids = new Set<string>();
  for (const raw of source.split('\n')) {
    const line = raw
      .replace(/"[^"]*"/g, '""')
      .replace(/\|[^|]*\|/g, '')
      .trim();
    if (line === '' || /^(flowchart|subgraph|end)\b/.test(line)) continue;
    for (const part of line.split(/\s*(?:-\.->|-->|---|==>|--)\s*/)) {
      const id = /^([A-Za-z_]\w*)/.exec(part.trim())?.[1];
      if (id !== undefined) ids.add(id);
    }
  }
  return ids;
}

export function participantCount(source: string): number {
  return source.split('\n').filter((line) => /^\s*(participant|actor)\s/.test(line)).length;
}

const FORBIDDEN_IN_SOURCE: readonly [string, RegExp][] = [
  ['classDef', /classDef/],
  ['style', /\bstyle\b/],
  ['linkStyle', /linkStyle/],
  ['click', /\bclick\b/],
  ['init directive', /%%\{/],
  ['script', /<script/i],
  ['javascript:', /javascript:/i],
  ['href', /\bhref\b/i],
  ['image or anchor tag', /<img|<a[\s>]/i],
  ['hex colour', /#[0-9a-f]{3,8}\b/i],
  ['rgb/hsl colour', /\b(?:rgba?|hsla?)\(/i],
  ['port number', /[A-Za-z\]]:\d{2,5}\b/],
];

/** Names of the forbidden constructs found in a Mermaid source. */
export function forbiddenInSource(source: string): string[] {
  return FORBIDDEN_IN_SOURCE.filter(([, pattern]) => pattern.test(source)).map(([name]) => name);
}

/**
 * Lines that carry an inline status class must start their label with the matching glyph.
 * Returns the offending lines.
 */
export function statusMismatches(source: string): string[] {
  const bad: string[] = [];
  for (const line of source.split('\n')) {
    if (!line.includes(':::')) continue;
    const match = /"(.)\s[^"]*"\s*[\])]*\s*:::(\w+)\s*$/u.exec(line);
    const expected = Object.values(STATUS_META).find((meta) => meta.cssClass === match?.[2])?.glyph;
    if (expected === undefined || expected !== match?.[1]) bad.push(line);
  }
  return bad;
}

/** Evidence of kinds that name a repository file whose file does not exist. */
export function missingEvidence(evidence: readonly Evidence[]): string[] {
  const pathLike = new Set(['code', 'test', 'contract', 'adr', 'doc', 'config']);
  return evidence
    .filter((item) => pathLike.has(item.kind))
    .map((item) => item.ref.replace(/[:#].*$/, ''))
    .filter((path) => !repoPathExists(path));
}

/** Ids of the diagrams and tables a section shows, in order, detail blocks included. */
export function blockRefs(section: Section): { diagrams: string[]; tables: string[] } {
  const blocks: readonly Block[] = [
    ...section.tabs.flatMap((tab) => tab.blocks),
    ...(section.detail ?? []),
  ];
  return {
    diagrams: blocks.flatMap((block) => (block.kind === 'diagram' ? [block.id] : [])),
    tables: blocks.flatMap((block) => (block.kind === 'table' ? [block.id] : [])),
  };
}

/**
 * Every string a reader can see inside a value, however deeply nested. Evidence `ref`s are left
 * out: they are repository paths with line numbers, not page text.
 */
export function allStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap((item) => allStrings(item));
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value)
      .filter(([key]) => key !== 'ref')
      .flatMap(([, item]) => allStrings(item));
  }
  return [];
}

/**
 * Strings no rendered page may contain: ports, internal names, secrets, and words that promise
 * more than the system does. The patterns avoid spelling the forbidden tokens out in full so
 * that this file does not trip the scans it supports.
 */
export const FORBIDDEN_IN_CONTENT: readonly [string, RegExp][] = [
  ['port number', /[A-Za-z\]]:\d{2,5}\b/],
  ['loopback address', /127\.0\.0\.1|\blocal-?host\b/i],
  ['storage-key header', /x-storage/i],
  ['internal route', /\/internal\//],
  ['credential', /pass(?:word)?[ _-]?(?:hash)?\s*[=:]|secret\s*[=:]|token\s*[=:]/i],
  ['database name', /gia_(?:user|db)|postgres_/i],
  ['sample file', /scanslide/i],
  ['promise: accepted', /aceptad[oa]/i],
  ['promise: approved', /aprobad[oa]/i],
  ['promise: protected', /protegid[oa]/i],
  ['promise: safe', /\bsegur[oa]\b/i],
  ['promise: only accessible', /solo accesible/i],
];

export function forbiddenInContent(value: unknown): string[] {
  const strings = allStrings(value);
  return FORBIDDEN_IN_CONTENT.filter(([, pattern]) =>
    strings.some((text) => pattern.test(text)),
  ).map(([name]) => name);
}
