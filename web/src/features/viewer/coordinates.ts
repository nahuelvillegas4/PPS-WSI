/**
 * Screen <-> level 0 conversion (annex A.3 of the contract).
 *
 * Pure functions so they can be tested against contract/fixtures/coordinates.json without a
 * browser. They are the ONLY place where the conversion happens.
 *
 * Trap: OpenSeadragon normalises the viewport by the image WIDTH on BOTH axes. Multiplying y by
 * the height gives wrong coordinates on every image that is not square.
 */
import type { Point, Size } from './ImageViewer';

/** Viewport bounds in OpenSeadragon viewport units (width of the image = 1). */
export interface ViewportBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function screenToLevel0(
  screen: Point,
  bounds: ViewportBounds,
  element: Size,
  imageWidth: number,
): Point {
  return {
    x: (bounds.x + (screen.x * bounds.width) / element.width) * imageWidth,
    y: (bounds.y + (screen.y * bounds.height) / element.height) * imageWidth,
  };
}

export function level0ToScreen(
  level0: Point,
  bounds: ViewportBounds,
  element: Size,
  imageWidth: number,
): Point {
  return {
    x: ((level0.x / imageWidth - bounds.x) * element.width) / bounds.width,
    y: ((level0.y / imageWidth - bounds.y) * element.height) / bounds.height,
  };
}

export function level0PerScreenPx(
  bounds: ViewportBounds,
  element: Size,
  imageWidth: number,
): number {
  return (bounds.width * imageWidth) / element.width;
}
