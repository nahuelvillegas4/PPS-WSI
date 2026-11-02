/**
 * Visible staleness: the hand-checked facts of the page carry a snapshot, and a banner shows when
 * that snapshot is more than 14 days old. These tests pin the rule and the snapshot itself; they
 * never look at the clock, because a test that starts failing as time passes would be noise.
 */
import { describe, expect, it } from 'vitest';
import { DIAGRAMS, SECTIONS, TABLES } from '../model/registry';
import { SNAPSHOT } from '../model/status';
import {
  STALE_AFTER_DAYS,
  contentStrings,
  formatSnapshotLabel,
  isSnapshotStale,
  parseIsoDate,
} from './checks';

function addDays(isoDate: string, days: number): string {
  const day = parseIsoDate(isoDate);
  if (day === undefined) throw new Error(`Not a date: ${isoDate}`);
  return new Date((day + days) * 86_400_000).toISOString().slice(0, 10);
}

describe('snapshot staleness', () => {
  it('shows the banner when the snapshot is more than 14 days older than today', () => {
    expect(STALE_AFTER_DAYS).toBe(14);
    expect(isSnapshotStale(SNAPSHOT.date, SNAPSHOT.date)).toBe(false);
    expect(isSnapshotStale(SNAPSHOT.date, addDays(SNAPSHOT.date, 14))).toBe(false);
    expect(isSnapshotStale(SNAPSHOT.date, addDays(SNAPSHOT.date, 15))).toBe(true);
  });
});

describe('SNAPSHOT', () => {
  it('has a calendar date, the label the page shows and a commit sha', () => {
    expect(parseIsoDate(SNAPSHOT.date)).toBeDefined();
    expect(SNAPSHOT.label).toBe(formatSnapshotLabel(SNAPSHOT.date));
    expect(SNAPSHOT.commit).toMatch(/^[0-9a-f]{7,40}$/);
  });

  it('is stated in the content, so every number can be read against a date and a commit', () => {
    const texts = contentStrings({
      sections: SECTIONS,
      diagrams: [...DIAGRAMS.values()],
      tables: [...TABLES.values()],
    }).map((hit) => hit.text);
    expect(texts.some((text) => text.includes(SNAPSHOT.label))).toBe(true);
    expect(texts.some((text) => text.includes(SNAPSHOT.commit))).toBe(true);
  });
});
