/** Pure helpers about the ordered list of sections: the index, the scope of the keys, the hash. */
import type { Section } from '../model/types';

type SectionRef = Pick<Section, 'id' | 'title' | 'group'>;

export interface TocEntry {
  id: string;
  title: string;
  group: Section['group'];
  /** "3" for the third stop of the walk-through, "A2" for the second annex. */
  ordinal: string;
}

/** One entry per section, numbered inside its own group. */
export function tocEntries(sections: readonly SectionRef[]): TocEntry[] {
  const seen = { recorrido: 0, anexo: 0 };
  return sections.map((section) => {
    seen[section.group] += 1;
    const n = seen[section.group];
    return {
      id: section.id,
      title: section.title,
      group: section.group,
      ordinal: section.group === 'anexo' ? `A${n}` : String(n),
    };
  });
}

/**
 * The ids the stop keys walk through: the sections of the group of the active one, so the keys of
 * a presentation never wander into the annexes. Unknown ids fall back to the walk-through.
 */
export function navScope(sections: readonly SectionRef[], activeId: string): string[] {
  const active = sections.find((section) => section.id === activeId);
  const group = active?.group ?? 'recorrido';
  return sections.filter((section) => section.group === group).map((section) => section.id);
}

/** "3 / 11" for the stops, "Anexo 2 / 7" for the annexes, empty when the id is unknown. */
export function progressLabel(sections: readonly SectionRef[], activeId: string): string {
  const entries = tocEntries(sections);
  const active = entries.find((entry) => entry.id === activeId);
  if (!active) return '';
  const inGroup = entries.filter((entry) => entry.group === active.group);
  const position = inGroup.findIndex((entry) => entry.id === activeId) + 1;
  return active.group === 'anexo'
    ? `Anexo ${position} / ${inGroup.length}`
    : `${position} / ${inGroup.length}`;
}

/** "Parada 3 de 11" for the stops, "Anexo 2 de 7" for the annexes, empty for an unknown id. */
export function positionLabel(sections: readonly SectionRef[], id: string): string {
  const entries = tocEntries(sections);
  const entry = entries.find((candidate) => candidate.id === id);
  if (!entry) return '';
  const inGroup = entries.filter((candidate) => candidate.group === entry.group);
  const position = inGroup.findIndex((candidate) => candidate.id === id) + 1;
  return `${entry.group === 'anexo' ? 'Anexo' : 'Parada'} ${String(position)} de ${String(inGroup.length)}`;
}

/** "1,5 min", "2 min"; `null` when the section has no time budget. */
export function formatMinutes(minutes: number | undefined): string | null {
  if (minutes === undefined) return null;
  return `${String(minutes).replace('.', ',')} min`;
}

/** The section a location hash points to (`#permisos`), or `null` if it names none. */
export function parseSectionHash(hash: string, ids: readonly string[]): string | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (raw === '') return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  return ids.includes(decoded) ? decoded : null;
}

/**
 * Whether the hash should be rewritten for `activeId`. A page opened without a hash stays that
 * way until the reader leaves the first stop, so the address bar does not change on arrival.
 */
export function shouldWriteHash(currentHash: string, activeId: string, firstId: string): boolean {
  if (currentHash === `#${activeId}`) return false;
  return !(currentHash === '' && activeId === firstId);
}

/**
 * The section the reading line is on: the first one in page order that crosses it, or the current
 * one when none does (for example over the footer).
 */
export function pickActiveId(
  ids: readonly string[],
  crossing: ReadonlySet<string>,
  current: string,
): string {
  return ids.find((id) => crossing.has(id)) ?? current;
}

/** Splits a block of text on blank lines into paragraphs, dropping empty ones. */
export function paragraphs(text: string): string[] {
  return text
    .split(/\r?\n\s*\r?\n/)
    .map((part) => part.trim())
    .filter((part) => part !== '');
}
