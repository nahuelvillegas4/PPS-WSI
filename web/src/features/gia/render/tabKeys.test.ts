import { describe, expect, it } from 'vitest';
import { nextTab } from './tabKeys';

const TABS = ['uno', 'dos', 'tres'];

describe('nextTab', () => {
  it('moves right and left one tab', () => {
    expect(nextTab(TABS, 'uno', 'ArrowRight')).toBe('dos');
    expect(nextTab(TABS, 'tres', 'ArrowLeft')).toBe('dos');
  });

  it('wraps around at both ends', () => {
    expect(nextTab(TABS, 'tres', 'ArrowRight')).toBe('uno');
    expect(nextTab(TABS, 'uno', 'ArrowLeft')).toBe('tres');
  });

  it('jumps to the first and last tab with Home and End', () => {
    expect(nextTab(TABS, 'dos', 'Home')).toBe('uno');
    expect(nextTab(TABS, 'dos', 'End')).toBe('tres');
  });

  it('returns null for keys that are not tab-bar keys', () => {
    for (const key of ['ArrowUp', 'ArrowDown', 'Enter', ' ', 'j', 'PageDown', 'Tab']) {
      expect(nextTab(TABS, 'dos', key)).toBeNull();
    }
  });

  it('treats an unknown active tab as the first one', () => {
    expect(nextTab(TABS, 'zzz', 'ArrowRight')).toBe('dos');
    expect(nextTab(TABS, 'zzz', 'ArrowLeft')).toBe('tres');
  });

  it('stays on the only tab of a single-tab bar', () => {
    expect(nextTab(['solo'], 'solo', 'ArrowRight')).toBe('solo');
    expect(nextTab(['solo'], 'solo', 'ArrowLeft')).toBe('solo');
  });

  it('returns null when there are no tabs', () => {
    expect(nextTab([], 'x', 'ArrowRight')).toBeNull();
  });
});
