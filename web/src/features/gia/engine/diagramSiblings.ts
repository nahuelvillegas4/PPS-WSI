import type { Block, Section } from '../model/types';

function collect(blocks: readonly Block[] | undefined, into: string[]): void {
  for (const block of blocks ?? []) {
    if (block.kind === 'diagram' && !into.includes(block.id)) into.push(block.id);
  }
}

/** Ids of the diagrams a section shows, in reading order: every tab, then the detail blocks. */
export function diagramIdsOf(section: Section): readonly string[] {
  const ids: string[] = [];
  for (const tab of section.tabs) collect(tab.blocks, ids);
  collect(section.detail, ids);
  return ids;
}

/**
 * The diagrams of the stop that shows `id`, for the previous and next buttons of the viewer.
 * A diagram that no section shows has no siblings.
 */
export function siblingDiagramIds(sections: readonly Section[], id: string): readonly string[] {
  for (const section of sections) {
    const ids = diagramIdsOf(section);
    if (ids.includes(id)) return ids;
  }
  return [id];
}

/** Position `step` places away in a list, wrapping around at both ends. */
export function neighbour(ids: readonly string[], current: string, step: 1 | -1): string {
  const index = ids.indexOf(current);
  if (index < 0 || ids.length === 0) return current;
  return ids[(index + step + ids.length) % ids.length] ?? current;
}
