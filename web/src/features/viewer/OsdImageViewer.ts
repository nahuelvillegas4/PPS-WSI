/**
 * `ImageViewer` adapter on top of OpenSeadragon. This is the ONLY file allowed to import it
 * (enforced by ESLint, architecture 5.2).
 */
import OpenSeadragon from 'openseadragon';
import {
  level0PerScreenPx,
  level0ToScreen,
  screenToLevel0,
  type ViewportBounds,
} from './coordinates';
import type { ImageViewer, Point, Size, Unsubscribe } from './ImageViewer';

const TILE_ERROR_WINDOW_MS = 5000;

export interface OsdImageViewerOptions {
  element: HTMLElement;
  imageId: number;
  /** URL of the Deep Zoom descriptor (`.dzi`). */
  tileSourceUrl: string;
}

export class OsdImageViewer implements ImageViewer {
  readonly imageId: number;
  /** Resolves when the descriptor has loaded; rejects if the image cannot be opened. */
  readonly ready: Promise<void>;

  private readonly viewer: OpenSeadragon.Viewer;
  private size: Size = { width: 0, height: 0 };
  private overlay: HTMLElement | undefined;
  private destroyed = false;
  private tileFailureTimes: number[] = [];
  private readonly tileErrorCallbacks = new Set<(failures: number) => void>();

  constructor(options: OsdImageViewerOptions) {
    this.imageId = options.imageId;
    this.viewer = OpenSeadragon({
      element: options.element,
      showNavigationControl: false,
      showNavigator: true,
      navigatorPosition: 'BOTTOM_RIGHT',
      maxZoomPixelRatio: 4,
      visibilityRatio: 0.5,
      constrainDuringPan: true,
      // The click is reserved for the annotation tools; zooming is by wheel or double click.
      gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: true },
    });

    this.ready = new Promise<void>((resolve, reject) => {
      this.viewer.addOnceHandler('open', () => {
        const content = this.viewer.world.getItemAt(0).getContentSize();
        this.size = { width: content.x, height: content.y };
        resolve();
      });
      this.viewer.addOnceHandler('open-failed', (event) => {
        reject(new Error(event.message));
      });
    });
    // Whoever does not await `ready` (for example after destroy) must not trigger an
    // unhandled rejection.
    this.ready.catch(() => undefined);

    this.viewer.addHandler('tile-load-failed', () => {
      const now = Date.now();
      this.tileFailureTimes = this.tileFailureTimes.filter((t) => now - t < TILE_ERROR_WINDOW_MS);
      this.tileFailureTimes.push(now);
      for (const callback of this.tileErrorCallbacks) callback(this.tileFailureTimes.length);
    });

    this.viewer.open({ tileSource: options.tileSourceUrl });
  }

  get level0Size(): Size {
    return this.size;
  }

  toLevel0(screen: Point): Point {
    const { bounds, element } = this.view();
    return screenToLevel0(screen, bounds, element, this.size.width);
  }

  toScreen(level0: Point): Point {
    const { bounds, element } = this.view();
    return level0ToScreen(level0, bounds, element, this.size.width);
  }

  level0PerScreenPx(): number {
    const { bounds, element } = this.view();
    return level0PerScreenPx(bounds, element, this.size.width);
  }

  onViewChange(callback: () => void): Unsubscribe {
    const handler = (): void => {
      callback();
    };
    this.viewer.addHandler('viewport-change', handler);
    this.viewer.addHandler('resize', handler);
    return () => {
      if (this.destroyed) return;
      this.viewer.removeHandler('viewport-change', handler);
      this.viewer.removeHandler('resize', handler);
    };
  }

  overlayElement(): HTMLElement {
    if (!this.overlay) {
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
      this.viewer.canvas.appendChild(overlay);
      this.overlay = overlay;
    }
    return this.overlay;
  }

  setPanZoomEnabled(enabled: boolean): void {
    this.viewer.setMouseNavEnabled(enabled);
  }

  onTileError(callback: (failures: number) => void): Unsubscribe {
    this.tileErrorCallbacks.add(callback);
    return () => {
      this.tileErrorCallbacks.delete(callback);
    };
  }

  zoomBy(factor: number): void {
    this.viewer.viewport.zoomBy(factor);
    this.viewer.viewport.applyConstraints();
  }

  goHome(): void {
    this.viewer.viewport.goHome();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.tileErrorCallbacks.clear();
    this.viewer.destroy();
  }

  private view(): { bounds: ViewportBounds; element: Size } {
    const rect = this.viewer.viewport.getBounds(true);
    const container = this.viewer.viewport.getContainerSize();
    return {
      bounds: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      element: { width: container.x, height: container.y },
    };
  }
}
