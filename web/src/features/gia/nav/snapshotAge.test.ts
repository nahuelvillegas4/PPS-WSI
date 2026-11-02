import { describe, expect, it } from 'vitest';
import { STALE_AFTER_DAYS, isSnapshotStale, snapshotAgeDays } from './snapshotAge';

const day = (iso: string) => Date.parse(`${iso}T12:00:00Z`);

describe('snapshotAgeDays', () => {
  it('is 0 on the day of the snapshot, even at noon', () => {
    expect(snapshotAgeDays('2026-11-02', day('2026-11-02'))).toBe(0);
  });

  it('counts whole days', () => {
    expect(snapshotAgeDays('2026-11-02', day('2026-11-09'))).toBe(7);
  });

  it('is NaN for a date that cannot be read', () => {
    expect(snapshotAgeDays('no es una fecha', day('2026-11-09'))).toBeNaN();
  });
});

describe('isSnapshotStale', () => {
  it('uses 14 days as the threshold', () => {
    expect(STALE_AFTER_DAYS).toBe(14);
  });

  it('is fresh up to and including 14 days', () => {
    expect(isSnapshotStale('2026-11-02', day('2026-11-16'))).toBe(false);
  });

  it('is stale after more than 14 days', () => {
    expect(isSnapshotStale('2026-11-02', day('2026-11-17'))).toBe(true);
  });

  it('treats an unreadable date as stale rather than hiding the problem', () => {
    expect(isSnapshotStale('', day('2026-11-02'))).toBe(true);
  });

  it('accepts another threshold', () => {
    expect(isSnapshotStale('2026-11-02', day('2026-11-05'), 2)).toBe(true);
  });
});
