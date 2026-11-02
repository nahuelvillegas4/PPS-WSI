/** Keyboard behaviour of a horizontal tab bar (WAI-ARIA tabs pattern, automatic activation). */

/**
 * The tab a key moves to, or `null` when the key is not a tab-bar key. Arrows wrap around;
 * Home and End jump to the ends. An unknown `activeId` counts as the first tab.
 */
export function nextTab(ids: readonly string[], activeId: string, key: string): string | null {
  const last = ids.length - 1;
  if (last < 0) return null;
  const index = Math.max(ids.indexOf(activeId), 0);
  switch (key) {
    case 'ArrowRight':
      return ids[index === last ? 0 : index + 1] ?? null;
    case 'ArrowLeft':
      return ids[index === 0 ? last : index - 1] ?? null;
    case 'Home':
      return ids[0] ?? null;
    case 'End':
      return ids[last] ?? null;
    default:
      return null;
  }
}
