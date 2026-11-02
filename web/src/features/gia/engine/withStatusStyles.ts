/**
 * Appends the `classDef` block of the four implementation statuses to a diagram source. Authors
 * only write `:::done`-style classes and a glyph in the label; the colours come from the palette
 * so the diagram follows the light and dark schemes. Unused classes are harmless.
 */
import { STATUS_META, type Status } from '../model/status';
import type { DiagramDef } from '../model/types';
import { mixHex, TINT, type Palette } from './mermaidTheme';

export type DiagramKind = DiagramDef['kind'];

export interface StatusStyle {
  fill: string;
  stroke: string;
  /** SVG `stroke-dasharray`; absent for a solid outline. */
  dash?: string;
}

export const STATUS_ORDER: readonly Status[] = ['done', 'partial', 'planned', 'unknown'];

/** Fill and outline of every status: tinted and solid when built, dashed or dotted when not. */
export function statusStyles(palette: Palette): Record<Status, StatusStyle> {
  return {
    done: { fill: mixHex(palette.surface, palette.accent, TINT), stroke: palette.accent },
    partial: { fill: mixHex(palette.surface, palette.warning, TINT), stroke: palette.warning },
    planned: { fill: palette.surface, stroke: palette.muted, dash: '6 4' },
    unknown: {
      fill: mixHex(palette.surface, palette.muted, TINT),
      stroke: palette.muted,
      dash: '2 3',
    },
  };
}

/**
 * The `classDef` lines for a diagram kind. Flowcharts and state diagrams get fill and outline
 * with the dash; ER diagrams only the outline colour (the dash does not apply to entities);
 * sequence and gantt diagrams have no node classes, so they get nothing.
 */
export function buildClassDefs(palette: Palette, kind: DiagramKind): string {
  if (kind === 'sequence' || kind === 'gantt') return '';
  const styles = statusStyles(palette);
  return STATUS_ORDER.map((status) => {
    const { fill, stroke, dash } = styles[status];
    const name = STATUS_META[status].cssClass;
    if (kind === 'er') return `classDef ${name} stroke:${stroke},stroke-width:2px`;
    const dashPart = dash ? `,stroke-dasharray:${dash}` : '';
    return `classDef ${name} fill:${fill},stroke:${stroke},stroke-width:2px${dashPart}`;
  })
    .map((line) => `  ${line}`)
    .join('\n');
}

export function withStatusStyles(source: string, palette: Palette, kind: DiagramKind): string {
  const defs = buildClassDefs(palette, kind);
  return defs === '' ? source : `${source.trimEnd()}\n${defs}\n`;
}

/** The source Mermaid receives: the styles are appended only when the diagram uses the statuses. */
export function styledSource(diagram: DiagramDef, palette: Palette): string {
  return diagram.usesStatus
    ? withStatusStyles(diagram.source, palette, diagram.kind)
    : diagram.source;
}
