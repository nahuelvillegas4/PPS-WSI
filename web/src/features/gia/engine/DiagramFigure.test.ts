// @vitest-environment jsdom
// A figure whose draw fails must say so in Spanish, without the address of the asset, and let the
// reader try again without reloading the page.
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { DIAGRAMS } from '../model/registry';
import { DiagramFigure } from './DiagramFigure';

const draw = vi.hoisted(() => ({ calls: 0, fail: true }));

vi.mock('./renderDiagram', () => ({
  StaleSchemeError: class StaleSchemeError extends Error {},
  renderDiagram: () => {
    draw.calls += 1;
    return draw.fail
      ? Promise.reject(
          new TypeError(
            'Failed to fetch dynamically imported module: http://127.0.0.1:5195/assets/mermaid.core-DDP4JATC.js',
          ),
        )
      : Promise.resolve({
          svg: '<svg viewBox="0 0 10 10"><title>dibujo</title></svg>',
          elementId: 'x',
        });
  },
}));

const DIAGRAM = [...DIAGRAMS.values()][0];

let container: HTMLDivElement;
let root: Root;

beforeAll(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  window.matchMedia = (query: string) =>
    ({
      media: query,
      matches: false,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }) as unknown as MediaQueryList;
});

beforeEach(async () => {
  if (!DIAGRAM) throw new Error('the catalogue has no diagram');
  draw.calls = 0;
  draw.fail = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(createElement(DiagramFigure, { id: DIAGRAM.id }));
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

function retryButton(): HTMLButtonElement | null {
  return container.querySelector<HTMLButtonElement>('.gia-diagram__retry');
}

describe('DiagramFigure after a failed draw', () => {
  it('shows a Spanish message without the asset address, the source and a retry button', () => {
    const card = container.querySelector('.gia-diagram__error');
    expect(card?.textContent).toContain('No se pudo dibujar este diagrama.');
    expect(card?.textContent).toContain('No se pudo cargar el módulo');
    expect(card?.textContent).not.toMatch(/https?:|127\.0\.0\.1|5195|\.js|Failed to fetch/);
    expect(card?.querySelector('pre')?.textContent).toBe(DIAGRAM?.source);
    expect(retryButton()?.textContent).toBe('Reintentar');
  });

  it('draws again when the reader presses "Reintentar", and the error card goes away', async () => {
    draw.fail = false;
    await act(async () => {
      retryButton()?.click();
      await Promise.resolve();
    });
    expect(draw.calls).toBe(2);
    expect(container.querySelector('.gia-diagram__error')).toBeNull();
    expect(container.querySelector('.gia-diagram__canvas')?.innerHTML).toContain('<svg');
  });

  it('stays on the error card, ready for another try, when the retry fails too', async () => {
    await act(async () => {
      retryButton()?.click();
      await Promise.resolve();
    });
    expect(draw.calls).toBe(2);
    expect(container.querySelector('.gia-diagram__error')).not.toBeNull();
    expect(retryButton()?.textContent).toBe('Reintentar');
  });
});
