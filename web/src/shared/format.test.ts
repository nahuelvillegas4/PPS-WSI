import { describe, expect, it } from 'vitest';
import { formatBytes } from './format';

describe('formatBytes', () => {
  it.each([
    [1, '1 B'],
    [1023, '1023 B'],
    [1024, '1.0 KB'],
    [1536, '1.5 KB'],
    [5 * 1024 ** 2, '5.0 MB'],
    [2.5 * 1024 ** 2, '2.5 MB'],
    [10 * 1024 ** 3, '10.0 GB'],
  ])('formats %d bytes as %s', (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected);
  });

  it('moves up a unit instead of printing 1024.0', () => {
    expect(formatBytes(1024 ** 2 - 1)).toBe('1.0 MB');
  });

  it('stays in gigabytes for very large sizes', () => {
    expect(formatBytes(3 * 1024 ** 4)).toBe('3072.0 GB');
  });

  it.each([0, -5, Number.NaN, Number.POSITIVE_INFINITY])('reads %s as 0 B', (bytes) => {
    expect(formatBytes(bytes)).toBe('0 B');
  });
});
