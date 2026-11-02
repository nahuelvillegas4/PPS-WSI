// @vitest-environment jsdom
// drawNow reads the colour scheme from `matchMedia` and cleans up through `document`, so this file
// runs under jsdom. Mermaid itself is replaced by a fake: only the order of the checks matters.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DIAGRAMS } from '../model/registry';
import { FALLBACK_PALETTE } from './mermaidTheme';

const loader = vi.hoisted(() => ({
  load: undefined as (() => Promise<unknown>) | undefined,
}));

vi.mock('./mermaidLoader', () => ({
  loadMermaid: () => {
    if (!loader.load) throw new Error('loader not prepared');
    return loader.load();
  },
  configureMermaid: vi.fn(),
}));

vi.mock('./mermaidTheme', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./mermaidTheme')>()),
  readPalette: () => FALLBACK_PALETTE,
  readFontFamily: () => 'system-ui, sans-serif',
}));

const { StaleSchemeError, renderDiagram } = await import('./renderDiagram');

let dark = false;

function useScheme(scheme: 'light' | 'dark'): void {
  dark = scheme === 'dark';
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const DIAGRAM = [...DIAGRAMS.values()][0];

describe('renderDiagram', () => {
  beforeEach(() => {
    dark = false;
    window.matchMedia = (query: string) =>
      ({
        media: query,
        get matches() {
          return dark;
        },
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }) as unknown as MediaQueryList;
  });

  it('does not draw, and does not cache, when the scheme flips during the Mermaid import', async () => {
    if (!DIAGRAM) throw new Error('the catalogue has no diagram');
    const render = vi.fn((id: string) => Promise.resolve({ svg: `<svg id="${id}"></svg>` }));
    const mermaid = { render };
    const imported = deferred<unknown>();
    loader.load = () => imported.promise;

    useScheme('light');
    const first = renderDiagram(DIAGRAM, 'light');
    await Promise.resolve();
    useScheme('dark');
    imported.resolve(mermaid);

    await expect(first).rejects.toBeInstanceOf(StaleSchemeError);
    expect(render).not.toHaveBeenCalled();

    // Back in the scheme that was asked for: nothing stale was cached, so it draws now.
    useScheme('light');
    loader.load = () => Promise.resolve(mermaid);
    const second = await renderDiagram(DIAGRAM, 'light');
    expect(render).toHaveBeenCalledTimes(1);
    expect(second.svg).toContain('<svg');
  });
});
