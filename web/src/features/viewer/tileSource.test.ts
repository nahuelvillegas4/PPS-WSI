import { describe, expect, it } from 'vitest';
import { tileSourceUrl } from './tileSource';

describe('tileSourceUrl', () => {
  it('follows the path of the tiles contract', () => {
    expect(tileSourceUrl(42)).toBe('/tiles/v1/images/42.dzi');
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('rejects %s', (value) => {
    expect(() => tileSourceUrl(value)).toThrow(RangeError);
  });
});
