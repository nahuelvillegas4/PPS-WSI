import { describe, expect, it } from 'vitest';
import { REQUIREMENTS } from '../../data/requirements';
import { readRepoFile, repoPathExists } from '../../drift/repoFiles.testing';
import { FACTS } from '../../model/facts';
import type { GapTheme } from '../../model/types';
import { THEME_ORDER, ofPps, stateCounts } from './derive';

interface EvidenceRef {
  path: string;
  from?: number;
  to?: number;
}

/** `path` or `path:line` or `path:from-to`. Paths of the requirements have no other colon. */
function parseEvidence(evidence: string): EvidenceRef {
  const match = /^(.+?)(?::(\d+)(?:-(\d+))?)?$/.exec(evidence);
  const path = match?.[1];
  if (path === undefined) throw new Error(`Unreadable evidence: ${evidence}`);
  const from = match?.[2] === undefined ? undefined : Number(match[2]);
  const to = match?.[3] === undefined ? from : Number(match[3]);
  return { path, ...(from === undefined ? {} : { from }), ...(to === undefined ? {} : { to }) };
}

/**
 * The first cited line must say what the requirement relies on. If the file moves on and the
 * line drifts, this fails and someone re-checks the citation instead of keeping a stale one.
 */
const LINE_SAYS: Record<string, RegExp> = {
  'P1-3.1': /classes/,
  'P1-3.2': /images\/upload/,
  'P1-3.3': /getDzi/,
  'P1-3.4': /annotations/,
  'P1-3.7': /export/,
  'P1-4.1': /"svs"/,
  'P1-4.2': /"login"/,
  'P1-4.3': /import openslide/,
  'P1-4.4': /tiles_router\.get\(/,
  'P1-7.6': /AuthorId = userId/,
  'P1-8.3': /JsonPropertyName\("classId"\)/,
  'P1-9.1': /S14/,
  'P1-9.8': /Sin entradas/,
  'P1-10': /Contrapartida de esfuerzo/,
  'P2-3.1': /HttpPost/,
  'P2-3.2': /classes/,
  'P2-3.5': /HasOne\(a => a\.Class\)/,
  'P2-3.6': /AuthorId != userId/,
  'P2-4.2': /interface ImageViewer/,
  'P2-4.3': /overlayElement\(\)/,
  'P2-6.5': /HttpPatch/,
  'P2-8.1': /S14/,
};

describe('REQUIREMENTS', () => {
  it('has one row for each requirement of the two statements and FACTS agrees', () => {
    expect(REQUIREMENTS).toHaveLength(79);
    expect(REQUIREMENTS).toHaveLength(FACTS.requirements);
    expect(ofPps(REQUIREMENTS, 1)).toHaveLength(39);
    expect(ofPps(REQUIREMENTS, 2)).toHaveLength(40);
  });

  it('counts 39 built, 35 partial, 1 planned and 4 not started', () => {
    expect(stateCounts(REQUIREMENTS)).toEqual({
      implemented: 39,
      partial: 35,
      planned: 1,
      notStarted: 4,
    });
  });

  it('counts 17 / 19 / 1 / 2 for PPS 1 and 22 / 16 / 0 / 2 for PPS 2', () => {
    expect(stateCounts(ofPps(REQUIREMENTS, 1))).toEqual({
      implemented: 17,
      partial: 19,
      planned: 1,
      notStarted: 2,
    });
    expect(stateCounts(ofPps(REQUIREMENTS, 2))).toEqual({
      implemented: 22,
      partial: 16,
      planned: 0,
      notStarted: 2,
    });
  });

  it('keeps the numbering of the statements, with unique ids prefixed by their PPS', () => {
    const ids = REQUIREMENTS.map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const row of REQUIREMENTS) {
      expect(row.id).toMatch(/^P[12]-(§\d+|\d+(\.\d+)?)$/);
      expect(row.id.startsWith(`P${String(row.pps)}-`)).toBe(true);
      expect(row.text.trim()).not.toBe('');
    }
  });

  it('gives a gap theme to every requirement that is not implemented and to no other', () => {
    for (const row of REQUIREMENTS) {
      if (row.state === 'implemented') expect(row.theme, row.id).toBeUndefined();
      else expect(row.theme, row.id).toBeDefined();
    }
  });

  it('uses each of the eight themes at least once', () => {
    const used = new Set<GapTheme>();
    for (const row of REQUIREMENTS) if (row.theme) used.add(row.theme);
    expect([...used].sort()).toEqual([...THEME_ORDER].sort());
  });

  it('cites one file that exists for every requirement', () => {
    const missing = REQUIREMENTS.filter((row) => !repoPathExists(parseEvidence(row.evidence).path));
    expect(missing.map((row) => `${row.id} -> ${row.evidence}`)).toEqual([]);
  });

  it('cites lines inside the file and every cited line has a check of what it says', async () => {
    const cited = REQUIREMENTS.filter((row) => parseEvidence(row.evidence).from !== undefined);
    expect(cited.map((row) => row.id).sort()).toEqual(Object.keys(LINE_SAYS).sort());
    for (const row of cited) {
      const { path, from, to } = parseEvidence(row.evidence);
      if (from === undefined || to === undefined) continue;
      const lines = (await readRepoFile(path)).split('\n');
      expect(to, `${row.id}: ${row.evidence}`).toBeLessThanOrEqual(lines.length);
      expect(from, row.id).toBeLessThanOrEqual(to);
      const says = LINE_SAYS[row.id];
      expect(lines[from - 1], `${row.id}: ${row.evidence}`).toMatch(says ?? /^$/);
    }
  });
});
