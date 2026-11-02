// @vitest-environment jsdom
// Mounts the whole page in jsdom and presses keys on it: the pure key rules are tested in
// sectionNav.test.ts, this file checks that the page wires them the way the presenter needs.
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { GiaPage } from '../GiaPage';
import { SECTIONS } from '../model/registry';

// Mounting the whole page is slower than a unit test, and the suite runs many files at once.
vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

// Mermaid is not under test here: a diagram that never finishes drawing is enough.
vi.mock('../engine/renderDiagram', () => ({
  StaleSchemeError: class StaleSchemeError extends Error {},
  renderDiagram: () => new Promise<never>(() => undefined),
  renderDiagramFresh: () => new Promise<never>(() => undefined),
}));

const STOPS = SECTIONS.filter((section) => section.group === 'recorrido').map(
  (section) => section.id,
);

class FakeObserver {
  observe(): void {
    // Nothing to observe: the page is not laid out in jsdom.
  }
  unobserve(): void {
    // Same.
  }
  disconnect(): void {
    // Same.
  }
}

let container: HTMLDivElement;
let root: Root;

beforeAll(() => {
  Object.assign(globalThis, {
    IS_REACT_ACT_ENVIRONMENT: true,
    IntersectionObserver: FakeObserver,
    ResizeObserver: FakeObserver,
    fetch: () => Promise.reject(new TypeError('offline')),
  });
  window.matchMedia = (query: string) =>
    ({
      media: query,
      matches: false,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }) as unknown as MediaQueryList;
  Element.prototype.scrollIntoView = () => undefined;
});

beforeEach(async () => {
  window.history.replaceState(null, '', '/');
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(createElement(GiaPage, { onBack: () => undefined, onNavigate: () => undefined }));
    await Promise.resolve();
  });
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
    await Promise.resolve();
  });
  container.remove();
});

afterAll(() => {
  vi.restoreAllMocks();
});

function activeStop(): string | undefined {
  return container.querySelector<HTMLElement>('section[data-active="true"]')?.id;
}

/** Presses a key on `target`; returns true when the page used it (it called preventDefault). */
async function press(key: string, target: Element = document.body): Promise<boolean> {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  await act(async () => {
    target.dispatchEvent(event);
    await Promise.resolve();
  });
  return event.defaultPrevented;
}

function button(text: string): HTMLButtonElement {
  const found = [...container.querySelectorAll('button')].find(
    (candidate) => candidate.textContent.trim() === text,
  );
  if (!found) throw new Error(`no button "${text}"`);
  return found;
}

async function nextFrame(): Promise<void> {
  await act(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}

describe('stop keys on the page', () => {
  it('start on the first stop and move one stop at a time', async () => {
    expect(activeStop()).toBe(STOPS[0]);
    expect(await press('PageDown')).toBe(true);
    expect(activeStop()).toBe(STOPS[1]);
    expect(await press('PageUp')).toBe(true);
    expect(activeStop()).toBe(STOPS[0]);
  });

  it('still move the stops while a tab of the tab bar has the focus (clicker keys)', async () => {
    const tab = container.querySelector('[role="tab"]');
    if (!tab) throw new Error('the first stop has no tab bar');
    expect(await press('PageDown', tab)).toBe(true);
    expect(activeStop()).toBe(STOPS[1]);
    expect(await press('k', tab)).toBe(true);
    expect(activeStop()).toBe(STOPS[0]);
  });

  it('leave the key alone at the first and last stop, so paging works there', async () => {
    expect(await press('PageUp')).toBe(false);
    expect(await press('Home')).toBe(false);
    expect(await press('End')).toBe(true);
    expect(activeStop()).toBe(STOPS[STOPS.length - 1]);
    expect(await press('PageDown')).toBe(false);
    expect(await press('End')).toBe(false);
    expect(activeStop()).toBe(STOPS[STOPS.length - 1]);
  });
});

describe('single-character shortcuts', () => {
  it('can be turned off in the help dialog while the arrows and Page keys keep working', async () => {
    const toggle = container.querySelector<HTMLInputElement>('.gia-help input[type="checkbox"]');
    if (!toggle) throw new Error('the help has no switch for the single-character keys');
    expect(toggle.checked).toBe(true);
    await act(async () => {
      toggle.click();
      await Promise.resolve();
    });
    expect(toggle.checked).toBe(false);

    expect(await press('j')).toBe(false);
    expect(await press('p')).toBe(false);
    expect(activeStop()).toBe(STOPS[0]);
    expect(await press('PageDown')).toBe(true);
    expect(activeStop()).toBe(STOPS[1]);
    expect(await press('ArrowLeft')).toBe(true);
    expect(activeStop()).toBe(STOPS[0]);
  });
});

describe('presentation mode', () => {
  it('moves the focus to "Salir" when entering and back to "Presentar" when leaving', async () => {
    await act(async () => {
      button('Presentar').focus();
      button('Presentar').click();
      await Promise.resolve();
    });
    await nextFrame();
    expect(container.querySelector('.gia-root')?.getAttribute('data-present')).toBe('true');
    expect(document.activeElement).toBe(button('Salir'));

    await act(async () => {
      button('Salir').click();
      await Promise.resolve();
    });
    await nextFrame();
    expect(container.querySelector('.gia-root')?.getAttribute('data-present')).toBeNull();
    expect(document.activeElement).toBe(button('Presentar'));
  });

  it('puts the focus on "Presentar" again when Escape leaves the presentation', async () => {
    expect(await press('p')).toBe(true);
    await nextFrame();
    expect(document.activeElement).toBe(button('Salir'));
    expect(await press('Escape', button('Salir'))).toBe(true);
    await nextFrame();
    expect(document.activeElement).toBe(button('Presentar'));
  });
});
