import { useCallback, useEffect, useRef, useState } from 'react';
import { POINTER_EVENTS } from './readerEvents';
import { parseSectionHash, pickActiveId } from './sectionIndex';

/** The reading line: a thin band a little above the middle of the viewport. */
const READING_LINE_MARGIN = '-35% 0px -60% 0px';

/** A jump stops steering the active section once the page has been still this long... */
const SETTLE_MS = 150;
/** ...or after this long at most, if the page never needed to scroll. */
const PIN_MAX_MS = 5000;

export interface ActiveSection {
  activeId: string;
  /**
   * Marks a section active right away (a jump by key or click). Until the scroll that follows
   * settles, or the reader takes over, the observer does not move the mark, so a long smooth
   * scroll does not flash through every stop it passes.
   */
  activate: (id: string) => void;
}

/**
 * Tracks which section the reader is on with an IntersectionObserver, starting from the section
 * in the location hash (or the first). `ids` must keep the same identity between renders.
 */
export function useActiveSection(ids: readonly string[]): ActiveSection {
  const [activeId, setActiveId] = useState(
    () => parseSectionHash(window.location.hash, ids) ?? ids[0] ?? '',
  );
  const pinned = useRef(false);
  const timers = useRef({ settle: 0, max: 0 });

  const release = useCallback(() => {
    pinned.current = false;
    window.clearTimeout(timers.current.settle);
    window.clearTimeout(timers.current.max);
  }, []);

  const activate = useCallback(
    (id: string) => {
      release();
      pinned.current = true;
      timers.current.max = window.setTimeout(release, PIN_MAX_MS);
      setActiveId(id);
    },
    [release],
  );

  // The pin ends when the page stops scrolling or the reader takes over by hand. Keys are left
  // out on purpose: the stop keys call `activate` from a keydown, and must not undo their own pin.
  useEffect(() => {
    const onScroll = () => {
      if (!pinned.current) return;
      window.clearTimeout(timers.current.settle);
      timers.current.settle = window.setTimeout(release, SETTLE_MS);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    for (const type of POINTER_EVENTS) window.addEventListener(type, release, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      for (const type of POINTER_EVENTS) window.removeEventListener(type, release);
      release();
    };
  }, [release]);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const crossing = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) crossing.add(entry.target.id);
          else crossing.delete(entry.target.id);
        }
        if (pinned.current) return;
        setActiveId((current) => pickActiveId(ids, crossing, current));
      },
      { rootMargin: READING_LINE_MARGIN, threshold: 0 },
    );
    for (const id of ids) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }
    return () => {
      observer.disconnect();
    };
  }, [ids]);

  return { activeId, activate };
}
