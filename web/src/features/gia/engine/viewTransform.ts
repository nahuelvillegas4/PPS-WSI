/**
 * Pure maths of the fullscreen diagram viewer. A transform maps a content point `p` to the
 * screen point `p * k + (x, y)`, with the origin at the top-left corner of the viewer stage.
 */
export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Transform {
  x: number;
  y: number;
  k: number;
}

export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 8;
/** Step of the `+` and `-` keys and of the zoom buttons. */
export const KEY_ZOOM_FACTOR = 1.25;

export const IDENTITY: Transform = { x: 0, y: 0, k: 1 };

/** Clamps a scale to [minZoom, MAX_ZOOM]; `minZoom` is below MIN_ZOOM only for a huge diagram. */
export function clampZoom(k: number, minZoom: number = MIN_ZOOM): number {
  return Math.min(MAX_ZOOM, Math.max(minZoom, k));
}

/**
 * Zooms by `factor` keeping the content point under `cursor` where it is. The resulting scale is
 * clamped to [MIN_ZOOM, MAX_ZOOM] (`minZoom` lowers the floor so a diagram larger than the screen
 * can still be zoomed out to its fitted size); at a limit the transform does not move.
 */
export function zoomAt(
  transform: Transform,
  cursor: Point,
  factor: number,
  minZoom: number = MIN_ZOOM,
): Transform {
  const k = clampZoom(transform.k * factor, minZoom);
  const ratio = k / transform.k;
  return {
    k,
    x: cursor.x - (cursor.x - transform.x) * ratio,
    y: cursor.y - (cursor.y - transform.y) * ratio,
  };
}

export function panBy(transform: Transform, dx: number, dy: number): Transform {
  return { ...transform, x: transform.x + dx, y: transform.y + dy };
}

/**
 * The transform that shows the whole content inside the viewport, centred, with `padding` around
 * it. A small diagram is enlarged up to MAX_ZOOM; a huge one is shrunk below MIN_ZOOM if that is
 * what it takes to show it whole (the viewer then lowers its zoom floor to that scale).
 */
export function fit(content: Size, viewport: Size, padding = 24): Transform {
  if (content.width <= 0 || content.height <= 0 || viewport.width <= 0 || viewport.height <= 0) {
    return IDENTITY;
  }
  const availableWidth = Math.max(1, viewport.width - 2 * padding);
  const availableHeight = Math.max(1, viewport.height - 2 * padding);
  const k = Math.min(MAX_ZOOM, availableWidth / content.width, availableHeight / content.height);
  return {
    k,
    x: (viewport.width - content.width * k) / 2,
    y: (viewport.height - content.height * k) / 2,
  };
}

/** The lowest zoom a viewer allows after fitting: 0.5, or the fitted scale if that is smaller. */
export function zoomFloor(fitted: Transform): number {
  return Math.min(MIN_ZOOM, fitted.k);
}

/** Zoom factor of a wheel event: smooth for trackpads, and lines or pages count as pixels. */
export function wheelFactor(deltaY: number, deltaMode: number): number {
  const pixels = deltaMode === 1 ? deltaY * 16 : deltaMode === 2 ? deltaY * 400 : deltaY;
  return Math.exp(-pixels * 0.0015);
}

export function centreOf(viewport: Size): Point {
  return { x: viewport.width / 2, y: viewport.height / 2 };
}

export function toCssTransform(transform: Transform): string {
  return `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`;
}
