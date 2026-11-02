import { describe, expect, it } from 'vitest';
import {
  IDENTITY,
  MAX_ZOOM,
  MIN_ZOOM,
  centreOf,
  fit,
  panBy,
  toCssTransform,
  wheelFactor,
  zoomAt,
  zoomFloor,
  type Point,
  type Transform,
} from './viewTransform';

/** The content point that sits under a screen point. */
function contentUnder(transform: Transform, screen: Point): Point {
  return { x: (screen.x - transform.x) / transform.k, y: (screen.y - transform.y) / transform.k };
}

describe('zoomAt', () => {
  it('keeps the content point under the cursor fixed', () => {
    const start: Transform = { x: 40, y: -25, k: 1.5 };
    const cursor = { x: 310, y: 190 };
    for (const factor of [1.25, 0.8, 2, 0.5, 1.01]) {
      const next = zoomAt(start, cursor, factor);
      const before = contentUnder(start, cursor);
      const after = contentUnder(next, cursor);
      expect(after.x).toBeCloseTo(before.x, 9);
      expect(after.y).toBeCloseTo(before.y, 9);
    }
  });

  it('multiplies the scale by the factor inside the limits', () => {
    expect(zoomAt(IDENTITY, { x: 0, y: 0 }, 2).k).toBe(2);
    expect(zoomAt({ x: 0, y: 0, k: 2 }, { x: 0, y: 0 }, 0.5).k).toBe(1);
  });

  it('clamps the scale to 0.5 and 8', () => {
    expect(zoomAt({ x: 0, y: 0, k: 4 }, { x: 10, y: 10 }, 100).k).toBe(MAX_ZOOM);
    expect(zoomAt({ x: 0, y: 0, k: 1 }, { x: 10, y: 10 }, 0.001).k).toBe(MIN_ZOOM);
    expect(MIN_ZOOM).toBe(0.5);
    expect(MAX_ZOOM).toBe(8);
  });

  it('lets a huge diagram zoom out to its fitted scale and no further', () => {
    const fitted: Transform = { x: 10, y: 0, k: 0.2 };
    const next = zoomAt(fitted, { x: 100, y: 100 }, 0.5, 0.2);
    expect(next).toEqual(fitted);
    expect(zoomAt({ x: 0, y: 0, k: 0.4 }, { x: 0, y: 0 }, 0.5, 0.2).k).toBeCloseTo(0.2, 12);
    expect(zoomAt({ x: 0, y: 0, k: 0.4 }, { x: 0, y: 0 }, 0.5).k).toBe(MIN_ZOOM);
  });

  it('does not move at a limit and still keeps the cursor point fixed when clamped part way', () => {
    const atMax: Transform = { x: 12, y: 34, k: MAX_ZOOM };
    expect(zoomAt(atMax, { x: 200, y: 100 }, 2)).toEqual(atMax);

    const start: Transform = { x: 5, y: 5, k: 6 };
    const cursor = { x: 80, y: 60 };
    const next = zoomAt(start, cursor, 3);
    expect(next.k).toBe(MAX_ZOOM);
    const before = contentUnder(start, cursor);
    const after = contentUnder(next, cursor);
    expect(after.x).toBeCloseTo(before.x, 9);
    expect(after.y).toBeCloseTo(before.y, 9);
  });
});

describe('fit', () => {
  it('scales the content to the viewport and centres it', () => {
    const wide = fit({ width: 400, height: 200 }, { width: 1000, height: 500 }, 0);
    expect(wide).toEqual({ k: 2.5, x: 0, y: 0 });

    const tall = fit({ width: 200, height: 400 }, { width: 1000, height: 500 }, 0);
    expect(tall.k).toBe(1.25);
    expect(tall.x).toBe((1000 - 200 * 1.25) / 2);
    expect(tall.y).toBe(0);
  });

  it('leaves the padding around the content', () => {
    expect(fit({ width: 400, height: 200 }, { width: 500, height: 300 }, 50)).toEqual({
      k: 1,
      x: 50,
      y: 50,
    });
  });

  it('enlarges a tiny diagram only up to 8 and shrinks a huge one until it fits', () => {
    expect(fit({ width: 10, height: 10 }, { width: 1000, height: 1000 }, 0).k).toBe(MAX_ZOOM);
    const huge = fit({ width: 1000, height: 4000 }, { width: 800, height: 500 }, 0);
    expect(huge.k).toBe(0.125);
    expect(huge.k).toBeLessThan(MIN_ZOOM);
    expect(huge.y).toBe(0);
    expect(huge.x).toBe((800 - 1000 * 0.125) / 2);
  });

  it('returns the identity for an empty content or viewport', () => {
    expect(fit({ width: 0, height: 10 }, { width: 100, height: 100 })).toEqual(IDENTITY);
    expect(fit({ width: 10, height: 10 }, { width: 0, height: 100 })).toEqual(IDENTITY);
  });
});

describe('panBy, wheelFactor, centreOf, toCssTransform', () => {
  it('pans without touching the scale', () => {
    expect(panBy({ x: 1, y: 2, k: 3 }, 10, -4)).toEqual({ x: 11, y: -2, k: 3 });
  });

  it('zooms in on a wheel up and out on a wheel down, and treats lines as pixels', () => {
    expect(wheelFactor(-100, 0)).toBeGreaterThan(1);
    expect(wheelFactor(100, 0)).toBeLessThan(1);
    expect(wheelFactor(0, 0)).toBe(1);
    expect(wheelFactor(-3, 1)).toBeCloseTo(wheelFactor(-48, 0), 12);
    expect(wheelFactor(100, 0) * wheelFactor(-100, 0)).toBeCloseTo(1, 12);
  });

  it('floors the zoom at 0.5, or lower when the fitted scale is lower', () => {
    expect(zoomFloor({ x: 0, y: 0, k: 1.4 })).toBe(MIN_ZOOM);
    expect(zoomFloor({ x: 0, y: 0, k: 0.3 })).toBe(0.3);
  });

  it('finds the centre of the stage', () => {
    expect(centreOf({ width: 800, height: 600 })).toEqual({ x: 400, y: 300 });
  });

  it('writes the transform as CSS', () => {
    expect(toCssTransform({ x: 10, y: -5, k: 2 })).toBe('translate(10px, -5px) scale(2)');
  });
});
