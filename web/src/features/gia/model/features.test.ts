/**
 * The tripwires of the planned items: while the page says an item is planned, the repository must
 * not contain it. When someone builds it the test fails and says which entry to update.
 */
import { describe, expect, it } from 'vitest';
import {
  checkFeatureDefinitions,
  tripwireHits,
  tripwireProblems,
  type RepoProbe,
} from '../drift/checks';
import { findRepoText, matchRepoGlob } from '../drift/repoFiles.testing';
import { FEATURES } from './features';

const PROBE: RepoProbe = { matchGlob: matchRepoGlob, findText: findRepoText };

const OPEN_ITEMS = Object.entries(FEATURES).filter(([, def]) => def.status !== 'done');

describe('FEATURES definitions', () => {
  it('gives every item that is not done a gap sentence and a tripwire', () => {
    expect(checkFeatureDefinitions(FEATURES)).toEqual([]);
  });

  it('searches folders that exist, so no tripwire is vacuous', () => {
    const empty = OPEN_ITEMS.flatMap(([id, def]) =>
      (def.absentText?.in ?? [])
        .filter((glob) => matchRepoGlob(glob).length === 0)
        .map((glob) => `${id}: ${glob}`),
    );
    expect(empty).toEqual([]);
  });
});

describe('FEATURES tripwires', () => {
  // The scans read every text file under web/, api/ or deploy/, so give them room.
  it.each(OPEN_ITEMS)(
    'item %s is still absent from the repository',
    async (_id, def) => {
      const hits = await tripwireHits(def, PROBE);
      expect(tripwireProblems(def, hits), `Found: ${hits.join(', ')}`).toEqual([]);
    },
    60_000,
  );
});
