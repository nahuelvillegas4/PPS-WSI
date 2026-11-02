// @vitest-environment jsdom
// The wheel must never reach the page behind the fullscreen viewer, wherever the pointer is.
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { DIAGRAMS } from '../model/registry';
import { DiagramViewer } from './DiagramViewer';

vi.mock('./renderDiagram', () => ({
  StaleSchemeError: class StaleSchemeError extends Error {},
  renderDiagram: () => new Promise<never>(() => undefined),
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
  // jsdom has no modal dialogs: the element only needs to report that it is open.
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
});

beforeEach(async () => {
  if (!DIAGRAM) throw new Error('the catalogue has no diagram');
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      createElement(DiagramViewer, { ids: [DIAGRAM.id], initialId: DIAGRAM.id, onClose: () => {} }),
    );
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

/** Rolls the wheel over `selector`; true when the browser's own scrolling was cancelled. */
async function wheelOver(selector: string): Promise<boolean> {
  const target = container.querySelector(selector);
  if (!target) throw new Error(`nothing matches ${selector}`);
  const event = new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true });
  await act(async () => {
    target.dispatchEvent(event);
    await Promise.resolve();
  });
  return event.defaultPrevented;
}

describe('DiagramViewer wheel', () => {
  it('does not let the page behind scroll over the toolbar', async () => {
    expect(await wheelOver('.gia-viewer__bar')).toBe(true);
    expect(await wheelOver('.gia-viewer__actions button')).toBe(true);
  });

  it('does not let the page behind scroll over the hint strip or the backdrop', async () => {
    expect(await wheelOver('.gia-viewer__hint')).toBe(true);
    expect(await wheelOver('dialog.gia-viewer')).toBe(true);
  });

  it('keeps zooming over the stage', async () => {
    expect(await wheelOver('.gia-viewer__stage')).toBe(true);
  });
});
