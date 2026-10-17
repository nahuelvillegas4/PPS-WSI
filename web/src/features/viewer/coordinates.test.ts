import { describe, expect, it } from 'vitest';
import fixture from '../../../../contract/fixtures/coordinates.json';
import { level0PerScreenPx, level0ToScreen, screenToLevel0 } from './coordinates';

const tolerance = fixture.tolerance;

function near(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}

function pair(values: number[]): [number, number] {
  const [first, second] = values;
  if (first === undefined || second === undefined) throw new Error('fixture: expected a pair');
  return [first, second];
}

describe.each(fixture.cases)('contract case $id', (testCase) => {
  const { image, viewer, viewportBounds } = testCase;

  it.each(testCase.points)('screen $screen -> level 0 $level0', (point) => {
    const [sx, sy] = pair(point.screen);
    const [x0, y0] = pair(point.level0);

    const result = screenToLevel0({ x: sx, y: sy }, viewportBounds, viewer, image.width);

    near(result.x, x0);
    near(result.y, y0);
  });

  it.each(testCase.points)('level 0 $level0 -> screen $screen', (point) => {
    const [sx, sy] = pair(point.screen);
    const [x0, y0] = pair(point.level0);

    const result = level0ToScreen({ x: x0, y: y0 }, viewportBounds, viewer, image.width);

    near(result.x, sx);
    near(result.y, sy);
  });

  it('reports the scale of the view', () => {
    near(level0PerScreenPx(viewportBounds, viewer, image.width), testCase.level0PxPerScreenPx);
  });
});

describe('traps of the contract', () => {
  const casesWithTraps = fixture.cases.flatMap((testCase) =>
    // Only some cases declare traps, so the JSON type has them optional.
    (testCase.traps ?? []).flatMap((trap) =>
      'wrongY_ifMultipliedByHeight' in trap ? [{ testCase, trap }] : [],
    ),
  );

  it('finds the traps of C1 and C3 in the fixture', () => {
    expect(casesWithTraps.map(({ testCase }) => testCase.id)).toEqual(['C1', 'C3']);
  });

  it.each(casesWithTraps)(
    'does not multiply y by the height ($testCase.id)',
    ({ testCase, trap }) => {
      const [sx, sy] = pair(trap.screen);
      const { image, viewer, viewportBounds } = testCase;

      const result = screenToLevel0({ x: sx, y: sy }, viewportBounds, viewer, image.width);

      near(result.y, pair(trap.correctLevel0)[1]);
      // The wrong value differs by far more than the tolerance, so this test would notice it.
      expect(Math.abs(result.y - trap.wrongY_ifMultipliedByHeight)).toBeGreaterThan(20);
    },
  );
});

describe('rectangle round trip', () => {
  it('draws the same stored geometry at the screen position of each zoom', () => {
    const { geometry, renders } = fixture.rectangleRoundTrip;

    for (const render of renders) {
      const testCase = fixture.cases.find((c) => c.id === render.case);
      if (!testCase) throw new Error(`fixture: missing case ${render.case}`);
      const { image, viewer, viewportBounds } = testCase;

      const topLeft = level0ToScreen(
        { x: geometry.x, y: geometry.y },
        viewportBounds,
        viewer,
        image.width,
      );
      const bottomRight = level0ToScreen(
        { x: geometry.x + geometry.width, y: geometry.y + geometry.height },
        viewportBounds,
        viewer,
        image.width,
      );

      near(topLeft.x, render.screenRect.x);
      near(topLeft.y, render.screenRect.y);
      near(bottomRight.x - topLeft.x, render.screenRect.width);
      near(bottomRight.y - topLeft.y, render.screenRect.height);
    }
  });
});
