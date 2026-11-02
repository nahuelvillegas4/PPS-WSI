/**
 * Static lint of a diagram definition (design 3.4). It reads the Mermaid source as text, so it is
 * a fast first gate: a separate jsdom test then runs the real `mermaid.parse` on every source.
 *
 * Authors write only structure, status classes (`:::done`) and glyphs; the engine owns every
 * style and colour. The checks below keep it that way and keep each diagram legible.
 */
import { STATUS_META, type Status } from '../model/status';
import type { DiagramDef } from '../model/types';

export type LintRule =
  | 'metadata'
  | 'id-format'
  | 'first-keyword'
  | 'kind-mismatch'
  | 'forbidden-token'
  | 'forbidden-html'
  | 'forbidden-directive'
  | 'colour-literal'
  | 'rect-colour'
  | 'class-name'
  | 'glyph-missing'
  | 'uses-status'
  | 'node-budget'
  | 'participant-budget'
  | 'unquoted-label'
  | 'label-length'
  | 'subgraph-break';

export interface LintIssue {
  rule: LintRule;
  message: string;
  /** 1-based line of the source, when the issue belongs to one. */
  line?: number;
}

export const DIAGRAM_KEYWORDS = [
  'flowchart',
  'sequenceDiagram',
  'erDiagram',
  'stateDiagram-v2',
  'gantt',
] as const;

const KIND_KEYWORD: Record<DiagramDef['kind'], (typeof DIAGRAM_KEYWORDS)[number]> = {
  flowchart: 'flowchart',
  sequence: 'sequenceDiagram',
  er: 'erDiagram',
  state: 'stateDiagram-v2',
  gantt: 'gantt',
};

export const MAX_FLOWCHART_NODES = 14;
export const MAX_SEQUENCE_PARTICIPANTS = 6;
export const MAX_LABEL_LINE = 40;

const STATUS_CLASSES = new Set<string>(
  (Object.keys(STATUS_META) as Status[]).map((status) => STATUS_META[status].cssClass),
);

export interface SourceLine {
  /** 1-based. */
  number: number;
  text: string;
}

/** Lines with their numbers; blank lines and `%%` comments (not the `%%{` directive) are dropped. */
export function codeLines(source: string): SourceLine[] {
  return source
    .split(/\r?\n/)
    .map((text, index) => ({ number: index + 1, text: text.trim() }))
    .filter(({ text }) => text !== '' && !(text.startsWith('%%') && !text.startsWith('%%{')));
}

function firstKeyword(lines: readonly SourceLine[]): string {
  return lines[0]?.text.split(/\s+/)[0] ?? '';
}

function metadataIssues(diagram: DiagramDef): LintIssue[] {
  const issues: LintIssue[] = [];
  const missing = (field: string): LintIssue => ({
    rule: 'metadata',
    message: `Diagram "${diagram.id}" has an empty ${field}.`,
  });
  if (diagram.title.trim() === '') issues.push(missing('title'));
  if (diagram.summary.trim() === '') issues.push(missing('summary'));
  if (diagram.source.trim() === '') issues.push(missing('source'));
  if (diagram.sources.length === 0) {
    issues.push({ rule: 'metadata', message: `Diagram "${diagram.id}" cites no evidence.` });
  }
  if (diagram.sources.some((evidence) => evidence.ref.trim() === '')) {
    issues.push({
      rule: 'metadata',
      message: `Diagram "${diagram.id}" has an empty evidence ref.`,
    });
  }
  if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(diagram.id) || /^g\d+$/.test(diagram.id)) {
    issues.push({
      rule: 'id-format',
      message: `Diagram id "${diagram.id}" must be the lowercase catalogue slug (for example "tesela"), not a G-number.`,
    });
  }
  return issues;
}

const FORBIDDEN_TOKENS: readonly { pattern: RegExp; token: string }[] = [
  { pattern: /%%\{/, token: '%%{' },
  { pattern: /\bclick\b/i, token: 'click' },
  { pattern: /<script/i, token: '<script' },
  { pattern: /javascript:/i, token: 'javascript:' },
  { pattern: /href/i, token: 'href' },
  { pattern: /<img/i, token: '<img' },
  { pattern: /<a[\s>/]/i, token: '<a' },
];

function forbiddenTokenIssues(source: string): LintIssue[] {
  const issues: LintIssue[] = [];
  source.split(/\r?\n/).forEach((text, index) => {
    for (const { pattern, token } of FORBIDDEN_TOKENS) {
      if (pattern.test(text)) {
        issues.push({
          rule: 'forbidden-token',
          message: `"${token}" is not allowed in a diagram source.`,
          line: index + 1,
        });
      }
    }
  });
  return issues;
}

/** HTML other than `<br/>`: state `<<choice>>` markers and arrows are not tags. */
function forbiddenHtmlIssues(lines: readonly SourceLine[]): LintIssue[] {
  const issues: LintIssue[] = [];
  for (const { number, text } of lines) {
    const plain = text.replace(/<<\w+>>/g, '');
    for (const tag of plain.match(/<\/?[A-Za-z][^>]*>/g) ?? []) {
      if (!/^<br\s*\/?>$/i.test(tag)) {
        issues.push({
          rule: 'forbidden-html',
          message: `${tag} is not allowed: <br/> is the only HTML in a diagram.`,
          line: number,
        });
      }
    }
  }
  return issues;
}

function directiveIssues(lines: readonly SourceLine[]): LintIssue[] {
  const issues: LintIssue[] = [];
  for (const { number, text } of lines) {
    const match = /^(classDef|style|linkStyle)\b/.exec(text);
    if (match) {
      issues.push({
        rule: 'forbidden-directive',
        message: `"${match[1] ?? ''}" is not allowed: the engine appends the styles (use :::done and a glyph).`,
        line: number,
      });
    }
  }
  return issues;
}

const HEX_COLOUR = /(?<![&\w])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w;])/;
const COLOUR_FUNCTION = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i;
const NEUTRAL_RECT =
  /^rect\s+rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*[\d.]+\s*)?\)$/;

/**
 * The only colour a source may carry is the grey of a sequence `rect` (it needs an argument and
 * a translucent neutral grey reads on both schemes); every other colour belongs to the engine.
 */
function colourIssues(lines: readonly SourceLine[]): LintIssue[] {
  const issues: LintIssue[] = [];
  for (const { number, text } of lines) {
    if (/^rect\b/.test(text)) {
      const channels = NEUTRAL_RECT.exec(text);
      const neutral =
        channels !== null && channels[1] === channels[2] && channels[2] === channels[3];
      if (!neutral) {
        issues.push({
          rule: 'rect-colour',
          message: `"${text}": a rect needs a neutral grey such as "rect rgba(128, 128, 128, 0.18)".`,
          line: number,
        });
      }
      continue;
    }
    if (HEX_COLOUR.test(text) || COLOUR_FUNCTION.test(text)) {
      issues.push({
        rule: 'colour-literal',
        message: 'A diagram source must not carry colours: status colours come from the palette.',
        line: number,
      });
    }
  }
  return issues;
}

interface ClassUse {
  name: string;
  line: number;
  /** The node id or quoted label the class is attached to, when it can be read. */
  label?: string;
  id?: string;
}

function classUses(lines: readonly SourceLine[]): ClassUse[] {
  const uses: ClassUse[] = [];
  for (const { number, text } of lines) {
    for (const match of text.matchAll(/:::([A-Za-z_][\w-]*)/g)) {
      const prefix = text.slice(0, match.index);
      const label = /"([^"]*)"\s*[\])}]*\s*$/.exec(prefix)?.[1];
      const id = /([A-Za-z_][\w-]*)\s*$/.exec(prefix)?.[1];
      uses.push({ name: match[1] ?? '', line: number, label, id });
    }
    const statement = /^class\s+(.+?)\s+([A-Za-z_][\w-]*)$/.exec(text);
    if (statement?.[1] && statement[2]) {
      for (const id of statement[1].split(',')) {
        uses.push({ name: statement[2], line: number, id: id.trim() });
      }
    }
  }
  return uses;
}

function mentionsWithGlyph(lines: readonly SourceLine[], id: string, glyph: string): boolean {
  const word = new RegExp(`(^|[^\\w-])${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\w-]|$)`);
  return lines.some(({ text }) => word.test(text) && text.includes(glyph));
}

function classIssues(diagram: DiagramDef, lines: readonly SourceLine[]): LintIssue[] {
  const issues: LintIssue[] = [];
  const uses = classUses(lines);
  for (const use of uses) {
    if (!STATUS_CLASSES.has(use.name)) {
      issues.push({
        rule: 'class-name',
        message: `Class "${use.name}" is not a status class (done, partial, planned, unknown).`,
        line: use.line,
      });
      continue;
    }
    // ER entities have no label to carry a glyph; their status is the outline colour.
    if (diagram.kind === 'er') continue;
    const glyph = STATUS_META[use.name as Status].glyph;
    const hasGlyph =
      use.label === undefined
        ? use.id !== undefined &&
          mentionsWithGlyph(
            lines.filter(({ number }) => number !== use.line),
            use.id,
            glyph,
          )
        : use.label.trimStart().startsWith(glyph);
    if (!hasGlyph) {
      issues.push({
        rule: 'glyph-missing',
        message: `A node with class "${use.name}" must start its label with the glyph ${glyph}.`,
        line: use.line,
      });
    }
  }
  if (uses.length > 0 && !diagram.usesStatus) {
    issues.push({
      rule: 'uses-status',
      message: 'The source uses status classes but usesStatus is false, so no styles are appended.',
    });
  }
  if (uses.length === 0 && diagram.usesStatus) {
    issues.push({
      rule: 'uses-status',
      message: 'usesStatus is true but the source uses no status class.',
    });
  }
  if (diagram.usesStatus && (diagram.kind === 'sequence' || diagram.kind === 'gantt')) {
    issues.push({
      rule: 'uses-status',
      message: `A ${diagram.kind} diagram has no node classes: mark status with Note/rect or gantt tags.`,
    });
  }
  return issues;
}

const SHAPE =
  /(?:\(\(\(|\[\[|\[\(|\(\(|\(\[|\{\{|\[\/|\[\\|[[({>])""(?:\)\)\)|\]\]|\)\]|\)\)|\]\)|\}\}|\/\]|\\\]|[\])}])/g;
const EDGE = /<?(?:-{2,}[>ox-]?|={2,}[>ox=]?|-\.+-?>?)|~{3,}/g;

interface FlowchartScan {
  nodes: Set<string>;
  unquoted: number[];
}

/** Distinct node ids of a flowchart, read from the edge and node statements. */
export function scanFlowchart(lines: readonly SourceLine[]): FlowchartScan {
  const nodes = new Set<string>();
  const subgraphs = new Set<string>();
  const unquoted: number[] = [];
  for (const { number, text } of lines.slice(1)) {
    if (text === 'end' || /^(direction|class)\b/.test(text)) continue;
    const subgraph = /^subgraph\b\s*([A-Za-z_]\w*)?/.exec(text);
    if (subgraph) {
      if (subgraph[1]) subgraphs.add(subgraph[1]);
      continue;
    }
    const segments = text
      .replace(/:::[\w-]+/g, '')
      .replace(/"[^"]*"/g, '""')
      .replace(SHAPE, '')
      .replace(/\|[^|]*\|/g, '')
      .replace(/""/g, '')
      .replace(EDGE, '\u0001')
      .replace(/[&;]/g, '\u0001')
      .split('\u0001')
      .map((segment) => segment.trim())
      .filter((segment) => segment !== '');
    if (segments.some((segment) => /[[\]{}()]/.test(segment))) unquoted.push(number);
    for (const segment of segments) {
      if (/^[A-Za-z_]\w*$/.test(segment)) nodes.add(segment);
    }
  }
  for (const id of subgraphs) nodes.delete(id);
  return { nodes, unquoted };
}

const ARROW = String.raw`(?:<<-{1,2}>>|-{1,2}>>|-{1,2}>|-{1,2}[)xX])`;
const MESSAGE = new RegExp(
  String.raw`^([^\s:+-][^\s:]*?)\s*${ARROW}\s*[+-]?\s*([^\s:]+)\s*:\s*(.*)$`,
);

/** Distinct participants of a sequence diagram: declared, message endpoints and note targets. */
export function scanParticipants(lines: readonly SourceLine[]): Set<string> {
  const ids = new Set<string>();
  for (const { text } of lines.slice(1)) {
    const declaration = /^(?:create\s+)?(?:participant|actor)\s+(\S+)/.exec(text);
    if (declaration?.[1]) ids.add(declaration[1]);
    const message = MESSAGE.exec(text);
    if (message?.[1] && message[2]) {
      ids.add(message[1]);
      ids.add(message[2]);
    }
    const note = /^note\s+(?:over|left of|right of)\s+([^:]+):/i.exec(text);
    if (note?.[1]) {
      for (const id of note[1].split(',')) ids.add(id.trim());
    }
  }
  return ids;
}

const GANTT_SETTINGS =
  /^(dateFormat|axisFormat|tickInterval|excludes|includes|todayMarker|weekday|weekend|topAxis|inclusiveEndDates|displayMode|accTitle|accDescr)\b/;

/** Label texts that are not quoted: sequence, gantt and state carry text after a colon or keyword. */
function bareLabels(lines: readonly SourceLine[], kind: DiagramDef['kind']): SourceLine[] {
  const labels: SourceLine[] = [];
  const add = (number: number, text: string | undefined): void => {
    if (text !== undefined && !text.trimStart().startsWith('"')) labels.push({ number, text });
  };
  for (const { number, text } of lines.slice(1)) {
    if (kind === 'sequence') {
      add(number, /^(?:create\s+)?(?:participant|actor)\s+\S+\s+as\s+(.+)$/.exec(text)?.[1]);
      add(number, MESSAGE.exec(text)?.[3]);
      add(number, /^note\s+(?:over|left of|right of)\s+[^:]+:\s*(.*)$/i.exec(text)?.[1]);
      add(number, /^(?:alt|else|opt|loop|par|and|critical|option|break)\s+(.+)$/.exec(text)?.[1]);
    } else if (kind === 'gantt') {
      if (GANTT_SETTINGS.test(text)) continue;
      const heading = /^(?:title|section)\s+(.+)$/.exec(text);
      add(number, heading ? heading[1] : text.split(':')[0]);
    } else if (kind === 'state') {
      add(number, /^[^"]*?[^:]:\s+(.+)$/.exec(text.replace(/:::[\w-]+/g, ''))?.[1]);
    }
  }
  return labels;
}

function labelIssues(lines: readonly SourceLine[], kind: DiagramDef['kind']): LintIssue[] {
  const texts: SourceLine[] = [...bareLabels(lines, kind)];
  for (const { number, text } of lines) {
    for (const match of text.matchAll(/"([^"]*)"/g)) {
      texts.push({ number, text: match[1] ?? '' });
    }
  }
  const issues: LintIssue[] = [];
  for (const { number, text } of texts) {
    for (const part of text.split(/<br\s*\/?>/i)) {
      const length = Array.from(part.trim()).length;
      if (length > MAX_LABEL_LINE) {
        issues.push({
          rule: 'label-length',
          message: `Label line "${part.trim()}" has ${String(length)} characters (maximum ${String(MAX_LABEL_LINE)}): break it with <br/>.`,
          line: number,
        });
      }
    }
  }
  return issues;
}

/** Everything wrong with a diagram definition; an empty list means it passes the static lint. */
export function lintDiagram(diagram: DiagramDef): LintIssue[] {
  const issues = metadataIssues(diagram);
  if (diagram.source.trim() === '') return issues;

  const lines = codeLines(diagram.source);
  const keyword = firstKeyword(lines);
  if (!(DIAGRAM_KEYWORDS as readonly string[]).includes(keyword)) {
    issues.push({
      rule: 'first-keyword',
      message: `The source must start with one of ${DIAGRAM_KEYWORDS.join(', ')}; found "${keyword}".`,
      line: lines[0]?.number,
    });
  } else if (keyword !== KIND_KEYWORD[diagram.kind]) {
    issues.push({
      rule: 'kind-mismatch',
      message: `kind "${diagram.kind}" needs a ${KIND_KEYWORD[diagram.kind]} source; found "${keyword}".`,
    });
  }

  issues.push(
    ...forbiddenTokenIssues(diagram.source),
    ...forbiddenHtmlIssues(lines),
    ...directiveIssues(lines),
    ...colourIssues(lines),
    ...classIssues(diagram, lines),
    ...labelIssues(lines, diagram.kind),
  );

  if (diagram.kind === 'flowchart') {
    const { nodes, unquoted } = scanFlowchart(lines);
    if (nodes.size > MAX_FLOWCHART_NODES) {
      issues.push({
        rule: 'node-budget',
        message: `The flowchart has ${String(nodes.size)} nodes (maximum ${String(MAX_FLOWCHART_NODES)}): split it.`,
      });
    }
    for (const line of unquoted) {
      issues.push({
        rule: 'unquoted-label',
        message: 'Quote every label with double quotes: A["text"].',
        line,
      });
    }
    for (const { number, text } of lines) {
      if (/^subgraph\b.*<br\s*\/?>/i.test(text)) {
        issues.push({
          rule: 'subgraph-break',
          message:
            'A <br/> in a subgraph title overlaps the first node: keep the title on one line.',
          line: number,
        });
      }
    }
  }
  if (diagram.kind === 'sequence') {
    const participants = scanParticipants(lines);
    if (participants.size > MAX_SEQUENCE_PARTICIPANTS) {
      issues.push({
        rule: 'participant-budget',
        message: `The sequence has ${String(participants.size)} participants (maximum ${String(MAX_SEQUENCE_PARTICIPANTS)}).`,
      });
    }
  }
  return issues;
}

/** One readable line per issue, prefixed with the diagram id, for test failure messages. */
export function formatIssues(diagram: DiagramDef): string[] {
  return lintDiagram(diagram).map(
    (issue) =>
      `${diagram.id}${issue.line === undefined ? '' : `:${String(issue.line)}`} [${issue.rule}] ${issue.message}`,
  );
}
