/**
 * Draws a diagram through the real Mermaid. Every render goes through one queue (Mermaid is not
 * re-entrant), draws with the palette of the current colour scheme and is cached as `id:scheme`.
 */
import type { DiagramDef } from '../model/types';
import { configureMermaid, loadMermaid } from './mermaidLoader';
import { readFontFamily, readPalette } from './mermaidTheme';
import { createRenderQueue } from './renderQueue';
import { currentColorScheme, type ColorScheme } from './useColorScheme';
import { styledSource } from './withStatusStyles';

export interface RenderedDiagram {
  /** The sanitised SVG string Mermaid returned. */
  svg: string;
  /** The id Mermaid gave the root element, needed to retag a copy of the drawing. */
  elementId: string;
}

const queue = createRenderQueue();

/** The scheme changed between asking for a render and running it; the caller asks again. */
export class StaleSchemeError extends Error {
  constructor() {
    super('The colour scheme changed while the diagram was waiting to be drawn.');
    this.name = 'StaleSchemeError';
  }
}

/** Removes the scratch elements Mermaid leaves behind when a render throws. */
function cleanup(elementId: string): void {
  document.getElementById(elementId)?.remove();
  document.getElementById(`d${elementId}`)?.remove();
}

async function drawNow(
  diagram: DiagramDef,
  scheme: ColorScheme,
  container?: HTMLElement,
): Promise<RenderedDiagram> {
  // The palette is read when the task runs, after earlier renders, from the live CSS variables.
  if (currentColorScheme() !== scheme) throw new StaleSchemeError();
  const mermaid = await loadMermaid();
  const palette = readPalette();
  configureMermaid(mermaid, palette, readFontFamily());
  const elementId = queue.nextElementId();
  try {
    const { svg } = await mermaid.render(elementId, styledSource(diagram, palette), container);
    return { svg, elementId };
  } finally {
    cleanup(elementId);
  }
}

/** Draws a diagram for the current scheme; repeated and concurrent calls share one render. */
export function renderDiagram(diagram: DiagramDef, scheme: ColorScheme): Promise<RenderedDiagram> {
  return queue.cached(`${diagram.id}:${scheme}`, () => drawNow(diagram, scheme));
}

/** Draws without reading or filling the cache, inside `container` (the in-browser verifier). */
export function renderDiagramFresh(
  diagram: DiagramDef,
  container: HTMLElement,
): Promise<RenderedDiagram> {
  const scheme = currentColorScheme();
  return queue.enqueue(() => drawNow(diagram, scheme, container));
}
