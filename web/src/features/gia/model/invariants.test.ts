/**
 * Structural rules every stop must keep, applied to the real registry. The pure checkers live in
 * `drift/checks.ts` (and are proven there with synthetic input); a failure here names the id of
 * the offending section, diagram, table or item.
 */
import { describe, expect, it } from 'vitest';
import { ADRS } from '../data/adrs';
import { MEASURED } from '../data/measured';
import { REQUIREMENTS } from '../data/requirements';
import {
  HEADLINE_MAX,
  checkAdrTableRows,
  checkAdrs,
  checkBlockReferences,
  checkBuiltClaimsHaveProof,
  checkFeatureDefinitions,
  checkMeasured,
  checkRequirements,
  checkSectionShape,
  checkStepperNotes,
  checkWalkthroughMinutes,
  findDuplicates,
  findInvalidIds,
  findRegisteredApprovals,
  parseAdrIndex,
} from '../drift/checks';
import { readRepoFile } from '../drift/repoFiles.testing';
import { FEATURES } from './features';
import { DIAGRAMS, SECTIONS, TABLES } from './registry';
import { SNAPSHOT } from './status';

const DIAGRAM_LIST = [...DIAGRAMS.values()];
const TABLE_LIST = [...TABLES.values()];

/** The catalogue of the design: 21 diagrams. */
const CATALOGUE_DIAGRAMS = 21;

describe('identifiers', () => {
  it('keeps section ids unique lowercase slugs', () => {
    const ids = SECTIONS.map((section) => section.id);
    expect([...findDuplicates(ids, 'section'), ...findInvalidIds(ids, 'section')]).toEqual([]);
  });

  it('keeps diagram and table ids unique lowercase slugs that match their registry key', () => {
    const problems = [
      ...[...DIAGRAMS]
        .filter(([key, diagram]) => key !== diagram.id)
        .map(([key]) => `diagram ${key}`),
      ...[...TABLES].filter(([key, table]) => key !== table.id).map(([key]) => `table ${key}`),
      ...findInvalidIds([...DIAGRAMS.keys()], 'diagram'),
      ...findInvalidIds([...TABLES.keys()], 'table'),
    ];
    expect(problems).toEqual([]);
  });

  it('keeps tab and footnote ids unique inside each section', () => {
    const problems = SECTIONS.flatMap((section) => [
      ...findDuplicates(
        section.tabs.map((tab) => tab.id),
        `tab of ${section.id}`,
      ),
      ...findInvalidIds(
        section.tabs.map((tab) => tab.id),
        `tab of ${section.id}`,
      ),
      ...findDuplicates(
        (section.footnotes ?? []).map((note) => note.id),
        `footnote of ${section.id}`,
      ),
    ]);
    expect(problems).toEqual([]);
  });

  it('registers the whole catalogue of diagrams', () => {
    expect(DIAGRAMS.size).toBe(CATALOGUE_DIAGRAMS);
  });
});

describe('sections', () => {
  it(`keeps headlines at ${HEADLINE_MAX} characters or fewer, 2 to 4 notes and tabs with blocks`, () => {
    expect(SECTIONS.flatMap(checkSectionShape)).toEqual([]);
  });

  it('keeps the walk-through between 18 and 24 minutes', () => {
    expect(checkWalkthroughMinutes(SECTIONS)).toEqual([]);
  });
});

describe('block references', () => {
  it('resolves every reference; one block per diagram, at least one per table', () => {
    expect(checkBlockReferences(SECTIONS, DIAGRAMS.keys(), TABLES.keys())).toEqual([]);
  });
});

describe('status rules', () => {
  it('gives every planned or undecided tripwire item a gap sentence and a tripwire', () => {
    expect(checkFeatureDefinitions(FEATURES)).toEqual([]);
  });

  it('explains the gap of every stepper step that is not fully done', () => {
    expect(checkStepperNotes(SECTIONS)).toEqual([]);
  });

  it('backs every done or partial claim with code, test, contract, config or dated run evidence', () => {
    expect(checkBuiltClaimsHaveProof(TABLE_LIST, DIAGRAM_LIST)).toEqual([]);
  });

  it('gives every requirement evidence when built and a gap theme when not', () => {
    expect(checkRequirements(REQUIREMENTS)).toEqual([]);
  });

  it('stamps every measured number with a date, a commit and a method', () => {
    expect(checkMeasured(MEASURED, SNAPSHOT.date)).toEqual([]);
  });
});

describe('decisions and approval', () => {
  it('shows ADR-07/08/09/10/15/16/17 as PROPUESTO, equal to docs/adr/README.md', async () => {
    const index = parseAdrIndex(await readRepoFile('docs/adr/README.md'));
    expect(index.size).toBeGreaterThan(0);
    expect(checkAdrs(ADRS, index)).toEqual([]);
    expect(checkAdrTableRows(TABLE_LIST, index)).toEqual([]);
  });

  it('never records the approval of the scope change as REGISTRADA', () => {
    expect(findRegisteredApprovals(TABLE_LIST)).toEqual([]);
  });
});
