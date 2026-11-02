/** How old the hand-written data of the page is, to warn when it was checked long ago. */

const DAY_MS = 86_400_000;

/** More than this many days after the snapshot, the page shows a staleness banner. */
export const STALE_AFTER_DAYS = 14;

/** Whole days between the snapshot date (`YYYY-MM-DD`, UTC) and `now`; `NaN` for a bad date. */
export function snapshotAgeDays(snapshotDate: string, now: number): number {
  const taken = Date.parse(`${snapshotDate}T00:00:00Z`);
  return Math.floor((now - taken) / DAY_MS);
}

/** True when the snapshot is more than `maxDays` old. A date that cannot be read counts as stale. */
export function isSnapshotStale(
  snapshotDate: string,
  now: number,
  maxDays: number = STALE_AFTER_DAYS,
): boolean {
  const age = snapshotAgeDays(snapshotDate, now);
  return Number.isNaN(age) || age > maxDays;
}
