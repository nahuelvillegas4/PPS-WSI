import { useEffect, useEffectEvent } from 'react';
import {
  type KeyTarget,
  type NavAction,
  isCharacterShortcut,
  keyToAction,
  shouldIgnoreKey,
} from './sectionNav';

/** What the filter needs to know about the element that received the key. */
function describeTarget(target: EventTarget | null): KeyTarget | null {
  if (!(target instanceof Element)) return null;
  return {
    tagName: target.tagName,
    isContentEditable: target instanceof HTMLElement && target.isContentEditable,
    inTablist: target.closest('[role="tablist"]') !== null,
    inOpenDialog: target.closest('dialog[open]') !== null,
    inScrollRegion: target.closest('[data-gia-scroll]') !== null,
  };
}

export interface GiaKeysOptions {
  /** When false the single-character shortcuts (j, k, f, n, p, ?) do nothing (WCAG 2.1.4). */
  characterKeys: boolean;
}

/**
 * Global keyboard shortcuts of the page. Leaves alone events with modifier keys, events from a
 * field, and the keys a tab bar or a scrollable table uses (arrows, Home, End), and everything
 * while a dialog is open. `onAction` returns true when it used the key, which then loses its
 * default; when it returns false (a move past the first or last stop) the key keeps its native
 * effect, such as paging.
 */
export function useGiaKeys(
  onAction: (action: NavAction) => boolean,
  { characterKeys }: GiaKeysOptions,
): void {
  const handle = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented) return;
    const action = keyToAction(event.key);
    if (action === null) return;
    if (!characterKeys && isCharacterShortcut(event.key)) return;
    const dialogOpen = document.querySelector('dialog[open]') !== null;
    if (shouldIgnoreKey(event.key, event, describeTarget(event.target), dialogOpen)) return;
    if (onAction(action)) event.preventDefault();
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      handle(event);
    };
    window.addEventListener('keydown', listener);
    return () => {
      window.removeEventListener('keydown', listener);
    };
  }, []);
}
