import { describe, expect, it } from 'vitest';
import { REQUIREMENTS } from '../../data/requirements';
import { readRepoFile, repoPathExists } from '../../drift/repoFiles.testing';
import { FACTS } from '../../model/facts';
import type { GapTheme } from '../../model/types';
import { EMPTY_FILTER, filterRows } from '../../render/tableFilter';
import { THEME_ORDER, ofPps, stateCounts } from './derive';
import { requisitosTable } from './requirementsTable';

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

  it('counts 37 built, 39 partial, 1 planned and 2 not started', () => {
    expect(stateCounts(REQUIREMENTS)).toEqual({
      implemented: 37,
      partial: 39,
      planned: 1,
      notStarted: 2,
    });
  });

  it('counts 16 / 21 / 1 / 1 for PPS 1 and 21 / 18 / 0 / 1 for PPS 2', () => {
    expect(stateCounts(ofPps(REQUIREMENTS, 1))).toEqual({
      implemented: 16,
      partial: 21,
      planned: 1,
      notStarted: 1,
    });
    expect(stateCounts(ofPps(REQUIREMENTS, 2))).toEqual({
      implemented: 21,
      partial: 18,
      planned: 0,
      notStarted: 1,
    });
  });

  it('keeps as not started only what has neither code nor an operative plan: the final report', () => {
    const notStarted = REQUIREMENTS.filter((row) => row.state === 'not-started').map(
      (row) => row.id,
    );
    expect(notStarted).toEqual(['P1-9.8', 'P2-8.9']);
    expect(REQUIREMENTS.filter((row) => row.state === 'planned').map((row) => row.id)).toEqual([
      'P1-8.5',
    ]);
  });

  it('shows the annotation persistence that exists in the API as partial, never as not started', async () => {
    const byId = new Map(REQUIREMENTS.map((row) => [row.id, row]));
    for (const id of ['P1-3.4', 'P1-7.5', 'P2-4.3', 'P2-6.5']) {
      expect(byId.get(id)?.state, id).toBe('partial');
    }
    const controller = await readRepoFile(
      'api/src/Pps.Api/Controllers/Annotations/AnnotationsController.cs',
    );
    expect(controller).toMatch(/\[HttpPost/);
    expect(controller).toMatch(/\[HttpPatch/);
  }, 30_000);

  it('applies one rule to the screens: a missing management screen counts against PPS 1 only', () => {
    const screens = REQUIREMENTS.filter((row) => row.theme === 'pantallas');
    expect(screens.map((row) => row.id)).toEqual([
      'P1-3.1',
      'P1-3.2',
      'P1-3.7',
      'P1-7.3',
      'P1-7.7',
      'P1-8.4',
    ]);
    expect(screens.every((row) => row.pps === 1)).toBe(true);
    // The same capability in the module of PPS 2 is graded on the API.
    const byId = new Map(REQUIREMENTS.map((row) => [row.id, row]));
    expect(byId.get('P2-3.8')?.state).toBe('implemented');
    expect(byId.get('P2-3.7')?.theme).toBe('datos-de-prueba');
    expect(requisitosTable.caption).toContain('cuenta contra la PPS 1');
  });

  it('does not call the pruebas reproducibles of the API implemented while its command is undocumented', async () => {
    const api = await readRepoFile('api/README.md');
    expect(api).not.toMatch(/dotnet test/);
    expect(REQUIREMENTS.find((row) => row.id === 'P2-8.8')?.state).toBe('partial');
    for (const readme of ['web/README.md', 'tiles/README.md']) {
      expect(await readRepoFile(readme), readme).toMatch(/npm test|pytest/);
    }
    expect(REQUIREMENTS.find((row) => row.id === 'P1-9.7')?.evidence).toBe('web/README.md');
  }, 30_000);

  it('says in annex A2 that the 79 rows are the team breakdown and how to see one PPS', () => {
    expect(requisitosTable.caption).toContain(
      `Los ${String(REQUIREMENTS.length)} requisitos son el desglose que hizo el equipo`,
    );
    expect(requisitosTable.caption).toContain('«P1-» o «P2-»');
    const found = (text: string) => filterRows(requisitosTable, { ...EMPTY_FILTER, text });
    expect(found('p1-')).toHaveLength(ofPps(REQUIREMENTS, 1).length);
    expect(found('p2-')).toHaveLength(ofPps(REQUIREMENTS, 2).length);
    // Only the state column is a status filter; the PPS column is not claimed to be one.
    const filterable = requisitosTable.columns.filter((column) => column.filterable === true);
    expect(filterable.map((column) => column.key)).toEqual(['state']);
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
  }, 30_000);
});
