import { useEffect } from 'react';
import { parseSectionHash, shouldWriteHash } from './sectionIndex';
import { scrollToAndHold } from './scrollHold';

/** How long the arrival keeps correcting the scroll position while diagrams grow the page. */
const ARRIVAL_HOLD_MS = 4000;

/**
 * Deep links (`/gia#permisos`): scrolls to the section named by the hash when the page opens and
 * keeps it aligned while content above it changes height, until the reader scrolls.
 */
export function useInitialHashAlignment(ids: readonly string[]): void {
  useEffect(() => {
    const id = parseSectionHash(window.location.hash, ids);
    const target = id === null ? null : document.getElementById(id);
    if (target === null) return;
    return scrollToAndHold(target, { smooth: false, maxMs: ARRIVAL_HOLD_MS });
  }, [ids]);
}

/** Calls `onHash` with the section id when the reader edits the hash or follows a `#id` link. */
export function useHashChange(ids: readonly string[], onHash: (id: string) => void): void {
  useEffect(() => {
    const listener = () => {
      const id = parseSectionHash(window.location.hash, ids);
      if (id !== null) onHash(id);
    };
    window.addEventListener('hashchange', listener);
    return () => {
      window.removeEventListener('hashchange', listener);
    };
  }, [ids, onHash]);
}

/**
 * Keeps the address bar on the active section (`replaceState`, so Back is not flooded). The first
 * stop of a page opened without a hash is left alone.
 */
export function useHashWriter(activeId: string, ids: readonly string[]): void {
  useEffect(() => {
    const firstId = ids[0] ?? '';
    if (!shouldWriteHash(window.location.hash, activeId, firstId)) return;
    try {
      window.history.replaceState(window.history.state, '', `#${activeId}`);
    } catch {
      // Some browsers throttle history updates; the address bar is a convenience.
    }
  }, [activeId, ids]);
}
