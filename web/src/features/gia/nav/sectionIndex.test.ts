import { describe, expect, it } from 'vitest';
import {
  formatMinutes,
  navScope,
  paragraphs,
  parseSectionHash,
  pickActiveId,
  positionLabel,
  progressLabel,
  shouldWriteHash,
  tocEntries,
} from './sectionIndex';

type Ref = Parameters<typeof tocEntries>[0][number];

const SECTIONS: Ref[] = [
  { id: 'uno', title: 'Uno', group: 'recorrido' },
  { id: 'dos', title: 'Dos', group: 'recorrido' },
  { id: 'tres', title: 'Tres', group: 'recorrido' },
  { id: 'api', title: 'API', group: 'anexo' },
  { id: 'req', title: 'Requisitos', group: 'anexo' },
];

describe('tocEntries', () => {
  it('numbers the stops 1..n and the annexes A1..An, each inside its own group', () => {
    expect(tocEntries(SECTIONS).map((entry) => entry.ordinal)).toEqual(['1', '2', '3', 'A1', 'A2']);
  });

  it('keeps ids, titles and groups', () => {
    expect(tocEntries(SECTIONS)[3]).toEqual({
      id: 'api',
      title: 'API',
      group: 'anexo',
      ordinal: 'A1',
    });
  });
});

describe('navScope', () => {
  it('walks the stops while a stop is active', () => {
    expect(navScope(SECTIONS, 'dos')).toEqual(['uno', 'dos', 'tres']);
  });

  it('walks the annexes while an annex is active', () => {
    expect(navScope(SECTIONS, 'req')).toEqual(['api', 'req']);
  });

  it('falls back to the stops for an unknown id', () => {
    expect(navScope(SECTIONS, 'nada')).toEqual(['uno', 'dos', 'tres']);
  });
});

describe('progressLabel', () => {
  it('reads "position / total" for the stops', () => {
    expect(progressLabel(SECTIONS, 'dos')).toBe('2 / 3');
    expect(progressLabel(SECTIONS, 'tres')).toBe('3 / 3');
  });

  it('says "Anexo" for the annexes', () => {
    expect(progressLabel(SECTIONS, 'req')).toBe('Anexo 2 / 2');
  });

  it('is empty for an unknown id', () => {
    expect(progressLabel(SECTIONS, 'nada')).toBe('');
  });
});

describe('positionLabel', () => {
  it('says which stop of the walk-through it is', () => {
    expect(positionLabel(SECTIONS, 'uno')).toBe('Parada 1 de 3');
    expect(positionLabel(SECTIONS, 'tres')).toBe('Parada 3 de 3');
  });

  it('says which annex it is', () => {
    expect(positionLabel(SECTIONS, 'req')).toBe('Anexo 2 de 2');
  });

  it('is empty for an unknown id', () => {
    expect(positionLabel(SECTIONS, 'nada')).toBe('');
  });
});

describe('formatMinutes', () => {
  it('uses a decimal comma and drops a needless decimal', () => {
    expect(formatMinutes(1.5)).toBe('1,5 min');
    expect(formatMinutes(2)).toBe('2 min');
  });

  it('is null when the section has no budget', () => {
    expect(formatMinutes(undefined)).toBeNull();
  });
});

describe('parseSectionHash', () => {
  const ids = ['que-es', 'permisos'];

  it('finds the section a hash points to', () => {
    expect(parseSectionHash('#permisos', ids)).toBe('permisos');
    expect(parseSectionHash('permisos', ids)).toBe('permisos');
  });

  it('decodes percent escapes', () => {
    expect(parseSectionHash('#que%2Des', ids)).toBe('que-es');
  });

  it('returns null for an empty, unknown or malformed hash', () => {
    expect(parseSectionHash('', ids)).toBeNull();
    expect(parseSectionHash('#', ids)).toBeNull();
    expect(parseSectionHash('#otra', ids)).toBeNull();
    expect(parseSectionHash('#%E0%A4%A', ids)).toBeNull();
  });
});

describe('shouldWriteHash', () => {
  it('does not touch the address when the page opened on the first stop without a hash', () => {
    expect(shouldWriteHash('', 'uno', 'uno')).toBe(false);
  });

  it('writes the hash when the reader reaches another stop', () => {
    expect(shouldWriteHash('', 'dos', 'uno')).toBe(true);
  });

  it('writes the first stop back when a hash was set and the reader returns to the top', () => {
    expect(shouldWriteHash('#tres', 'uno', 'uno')).toBe(true);
  });

  it('does nothing when the hash already names the active stop', () => {
    expect(shouldWriteHash('#dos', 'dos', 'uno')).toBe(false);
  });
});

describe('pickActiveId', () => {
  const ids = ['a', 'b', 'c'];

  it('takes the first section in page order that crosses the reading line', () => {
    expect(pickActiveId(ids, new Set(['c', 'b']), 'a')).toBe('b');
  });

  it('keeps the current section when none crosses the line', () => {
    expect(pickActiveId(ids, new Set(), 'c')).toBe('c');
  });

  it('ignores ids that are not sections', () => {
    expect(pickActiveId(ids, new Set(['zzz']), 'a')).toBe('a');
  });
});

describe('paragraphs', () => {
  it('splits on blank lines and trims', () => {
    expect(paragraphs('Uno.\n\n  Dos.  \r\n\r\nTres.')).toEqual(['Uno.', 'Dos.', 'Tres.']);
  });

  it('keeps a single line break inside a paragraph', () => {
    expect(paragraphs('Uno\nsigue')).toEqual(['Uno\nsigue']);
  });

  it('returns nothing for blank text', () => {
    expect(paragraphs('  \n\n ')).toEqual([]);
  });
});
