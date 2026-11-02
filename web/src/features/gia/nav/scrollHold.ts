import { READER_EVENTS } from './readerEvents';

export interface ScrollHoldOptions {
  /** Animate the scroll (a jump between stops) or move at once (arriving by a deep link). */
  smooth: boolean;
  /** The hold gives up after this long even if the reader does nothing. */
  maxMs: number;
}

/**
 * Scrolls `target` to the top of the viewport and keeps it there while the page changes height
 * (diagrams render after the first paint and push content around), until the reader scrolls,
 * presses a key, or `maxMs` pass. Returns a function that ends the hold early.
 */
export function scrollToAndHold(target: HTMLElement, options: ScrollHoldOptions): () => void {
  let holding = true;
  let timer = 0;
  // An observer reports once as soon as it starts watching; that first report is not a change.
  let firstReport = true;
  const observer = new ResizeObserver(() => {
    if (firstReport) {
      firstReport = false;
      return;
    }
    if (holding) target.scrollIntoView({ block: 'start' });
  });
  const stop = () => {
    if (!holding) return;
    holding = false;
    observer.disconnect();
    window.clearTimeout(timer);
    for (const type of READER_EVENTS) window.removeEventListener(type, stop);
  };

  observer.observe(document.body);
  timer = window.setTimeout(stop, options.maxMs);
  for (const type of READER_EVENTS) window.addEventListener(type, stop, { passive: true });
  target.scrollIntoView({ block: 'start', behavior: options.smooth ? 'smooth' : 'auto' });
  return stop;
}
