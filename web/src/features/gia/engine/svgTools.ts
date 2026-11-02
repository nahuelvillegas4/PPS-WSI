/** Small pure helpers over the SVG string that Mermaid returns. */
import type { Size } from './viewTransform';

const VIEW_BOX = /<svg\b[^>]*\bviewBox="([^"]+)"/i;

/** Natural size of the drawing, from the root `viewBox`; undefined when absent or malformed. */
export function parseViewBox(svg: string): Size | undefined {
  const match = VIEW_BOX.exec(svg);
  const parts = match?.[1]
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  if (parts?.length !== 4 || parts.some((part) => !Number.isFinite(part))) return undefined;
  const [, , width, height] = parts;
  if (width === undefined || height === undefined) return undefined;
  return { width, height };
}

/**
 * Renames the element id Mermaid generated (`gia-d-3`) to `toId` everywhere it appears: the root
 * id, the scoped stylesheet selectors and the marker references. A copy of the drawing shown next
 * to the original (the fullscreen viewer) then never duplicates an id in the document.
 */
export function retagSvgIds(svg: string, fromId: string, toId: string): string {
  return svg.split(fromId).join(toId);
}

/**
 * A reason why a rendered drawing is unusable, or undefined when it looks fine. Catches the
 * failures that do not throw: Mermaid's own error drawing and a drawing with no size (a gantt
 * measured in a hidden container).
 */
export function inspectSvg(svg: string): string | undefined {
  if (!/<svg\b/i.test(svg)) return 'Mermaid no devolvió un SVG.';
  if (/Syntax error in text/i.test(svg)) return 'Mermaid dibujó su propio error de sintaxis.';
  const size = parseViewBox(svg);
  if (!size) return 'El dibujo no declara su tamaño (viewBox).';
  if (size.width <= 1 || size.height <= 1) {
    return `El dibujo tiene tamaño nulo (${String(size.width)} x ${String(size.height)}).`;
  }
  return undefined;
}

/** The message of whatever a failed render threw; never empty. */
export function describeRenderError(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  const message = text.trim();
  return message === '' ? 'Error desconocido al dibujar el diagrama.' : message;
}

/** Messages of a failed dynamic import or fetch, which differ by browser. */
const LOAD_FAILURE =
  /dynamically imported module|importing a module script failed|error loading dynamically|failed to fetch|networkerror|load failed|chunkloaderror/i;
const URL_IN_TEXT = /\b(?:https?|file):\/\/\S+/gi;

/**
 * What the reader sees when a diagram cannot be drawn: Spanish for the failures a reader can act
 * on (the library did not load, the draw took too long) and, for anything else, the message of
 * the error without the addresses in it (an asset URL names a host and a port).
 */
export function renderErrorMessage(error: unknown): string {
  if (error instanceof Error && error.name === 'RenderTimeoutError') {
    return 'El dibujo tardó demasiado en completarse. Vuelva a intentarlo.';
  }
  const message = describeRenderError(error);
  if (LOAD_FAILURE.test(message)) {
    return 'No se pudo cargar el módulo que dibuja los diagramas. Revise la conexión y vuelva a intentarlo.';
  }
  const cleaned = message.replace(URL_IN_TEXT, '').trim();
  return cleaned === '' ? 'Error desconocido al dibujar el diagrama.' : cleaned;
}
