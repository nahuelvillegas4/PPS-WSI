const UNITS = ['B', 'KB', 'MB', 'GB'] as const;

/** Rounds like `toFixed(1)` does, so a value that would print as `1024.0` moves up a unit. */
function roundedToTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Formats a byte count for people: `512 B`, `1.5 KB`, `3.2 MB`, `10.0 GB`.
 * Anything that is not a positive finite number reads as `0 B`.
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';

  let value = bytes;
  let unit = 0;
  while (unit < UNITS.length - 1 && roundedToTenth(value) >= 1024) {
    value /= 1024;
    unit += 1;
  }
  return unit === 0 ? `${value} B` : `${value.toFixed(1)} ${UNITS[unit]}`;
}
