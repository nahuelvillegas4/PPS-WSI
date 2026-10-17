/**
 * Frontend part of the integration contract (architecture 5.2, PPS 2 section 4).
 *
 * The annotation editor depends on the viewer ONLY through this interface, never on
 * OpenSeadragon. Coordinates: x grows to the right, y grows down, in pixels of level 0.
 */
export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export type Unsubscribe = () => void;

export interface ImageViewer {
  /** Id of the image in the API. */
  readonly imageId: number;
  /** Size of level 0 in pixels. Zero until the image has opened. */
  readonly level0Size: Size;
  /** Pixels of the viewer element -> level 0. May fall outside the image. */
  toLevel0(screen: Point): Point;
  /** Level 0 -> pixels of the viewer element. */
  toScreen(level0: Point): Point;
  /** Current scale: level 0 pixels per screen pixel (click tolerance, stroke width). */
  level0PerScreenPx(): number;
  /** Pan, zoom, animation and element resize. */
  onViewChange(callback: () => void): Unsubscribe;
  /** Container aligned with the viewer where the editor draws its SVG layer. */
  overlayElement(): HTMLElement;
  /** Disabled while the user is drawing. */
  setPanZoomEnabled(enabled: boolean): void;
  /** Reports how many tiles failed to load in the last few seconds. */
  onTileError(callback: (failures: number) => void): Unsubscribe;
}
