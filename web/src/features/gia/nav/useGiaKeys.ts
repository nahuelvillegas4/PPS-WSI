import { useEffect, useEffectEvent } from 'react';
import { type KeyTarget, type NavAction, keyToAction, shouldIgnoreKey } from './sectionNav';

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

/**
 * Global keyboard shortcuts of the page. Leaves alone events with modifier keys, events from a
 * tab bar, a field or a scrollable table (for the keys they use), and everything while a
 * dialog is open. `onAction` returns true when it used the key, which then loses its default.
 */
export function useGiaKeys(onAction: (action: NavAction) => boolean): void {
  const handle = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented) return;
    const action = keyToAction(event.key);
    if (action === null) return;
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
