import { describe, expect, it } from 'vitest';
import {
  KEY_HELP,
  type KeyModifiers,
  type KeyTarget,
  displayKey,
  isCharacterShortcut,
  isMoveAction,
  keyToAction,
  moveDestination,
  resolveNavTarget,
  shouldIgnoreKey,
} from './sectionNav';

const IDS = ['a', 'b', 'c', 'd'];
const NO_MODS: KeyModifiers = { ctrlKey: false, altKey: false, metaKey: false, shiftKey: false };
const PLAIN_TARGET: KeyTarget = {
  tagName: 'BODY',
  isContentEditable: false,
  inTablist: false,
  inOpenDialog: false,
  inScrollRegion: false,
};

describe('keyToAction', () => {
  it.each([
    ['ArrowRight', 'next'],
    ['PageDown', 'next'],
    ['j', 'next'],
    ['ArrowLeft', 'prev'],
    ['PageUp', 'prev'],
    ['k', 'prev'],
    ['Home', 'first'],
    ['End', 'last'],
    ['f', 'fullscreen'],
    ['n', 'notes'],
    ['p', 'present'],
    ['?', 'help'],
    ['Escape', 'close'],
  ])('maps %s to %s', (key, action) => {
    expect(keyToAction(key)).toBe(action);
  });

  it('is not case sensitive for letters (caps lock)', () => {
    expect(keyToAction('J')).toBe('next');
    expect(keyToAction('P')).toBe('present');
  });

  it('returns null for keys that mean nothing here', () => {
    for (const key of ['a', 'Enter', ' ', 'ArrowUp', 'ArrowDown', 'Tab', 'F5']) {
      expect(keyToAction(key)).toBeNull();
    }
  });

  it('lists in the help only keys that really trigger the action next to them', () => {
    for (const entry of KEY_HELP) {
      for (const key of entry.keys) expect(keyToAction(key)).toBe(entry.action);
    }
  });

  it('documents every action in the help', () => {
    const documented = new Set(KEY_HELP.map((entry) => entry.action));
    for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End', 'f', 'n', 'p', '?', 'Escape']) {
      const action = keyToAction(key);
      expect(action).not.toBeNull();
      if (action !== null) expect(documented.has(action)).toBe(true);
    }
  });
});

describe('isCharacterShortcut', () => {
  it('is true only for the single-character shortcuts, in either case', () => {
    for (const key of ['j', 'k', 'f', 'n', 'p', '?', 'J']) {
      expect(isCharacterShortcut(key)).toBe(true);
    }
  });

  it('is false for the named keys and for characters that mean nothing', () => {
    for (const key of ['ArrowRight', 'PageDown', 'PageUp', 'Home', 'End', 'Escape', 'a', ' ']) {
      expect(isCharacterShortcut(key)).toBe(false);
    }
  });
});

describe('isMoveAction', () => {
  it('is true only for the four movements', () => {
    for (const action of ['next', 'prev', 'first', 'last'] as const) {
      expect(isMoveAction(action)).toBe(true);
    }
    expect(isMoveAction('notes')).toBe(false);
    expect(isMoveAction('close')).toBe(false);
  });
});

describe('resolveNavTarget', () => {
  it('moves one stop at a time', () => {
    expect(resolveNavTarget(IDS, 'b', 'next')).toBe('c');
    expect(resolveNavTarget(IDS, 'c', 'prev')).toBe('b');
  });

  it('clamps at the last stop instead of wrapping around', () => {
    expect(resolveNavTarget(IDS, 'd', 'next')).toBe('d');
  });

  it('clamps at the first stop instead of wrapping around', () => {
    expect(resolveNavTarget(IDS, 'a', 'prev')).toBe('a');
  });

  it('jumps to the ends', () => {
    expect(resolveNavTarget(IDS, 'c', 'first')).toBe('a');
    expect(resolveNavTarget(IDS, 'b', 'last')).toBe('d');
  });

  it('treats an unknown current stop as "before the first"', () => {
    expect(resolveNavTarget(IDS, 'zzz', 'next')).toBe('a');
    expect(resolveNavTarget(IDS, 'zzz', 'prev')).toBe('a');
  });

  it('returns null when there are no stops', () => {
    for (const action of ['next', 'prev', 'first', 'last'] as const) {
      expect(resolveNavTarget([], 'a', action)).toBeNull();
    }
  });
});

describe('moveDestination', () => {
  it('is the next or previous stop when there is one', () => {
    expect(moveDestination(IDS, 'b', 'next')).toBe('c');
    expect(moveDestination(IDS, 'b', 'prev')).toBe('a');
    expect(moveDestination(IDS, 'b', 'first')).toBe('a');
    expect(moveDestination(IDS, 'b', 'last')).toBe('d');
  });

  it('is null at the ends, so the key keeps its native effect there', () => {
    expect(moveDestination(IDS, 'd', 'next')).toBeNull();
    expect(moveDestination(IDS, 'd', 'last')).toBeNull();
    expect(moveDestination(IDS, 'a', 'prev')).toBeNull();
    expect(moveDestination(IDS, 'a', 'first')).toBeNull();
  });

  it('is null when there are no stops', () => {
    expect(moveDestination([], 'a', 'next')).toBeNull();
  });
});

describe('shouldIgnoreKey', () => {
  it('lets a plain key on the page through', () => {
    expect(shouldIgnoreKey('j', NO_MODS, PLAIN_TARGET, false)).toBe(false);
    expect(shouldIgnoreKey('j', NO_MODS, null, false)).toBe(false);
  });

  it.each(['ctrlKey', 'altKey', 'metaKey'] as const)('ignores events with %s', (modifier) => {
    expect(shouldIgnoreKey('j', { ...NO_MODS, [modifier]: true }, PLAIN_TARGET, false)).toBe(true);
  });

  it('ignores Shift combinations except the question mark', () => {
    expect(shouldIgnoreKey('J', { ...NO_MODS, shiftKey: true }, PLAIN_TARGET, false)).toBe(true);
    expect(shouldIgnoreKey('?', { ...NO_MODS, shiftKey: true }, PLAIN_TARGET, false)).toBe(false);
  });

  it('ignores keys typed in fields', () => {
    for (const tagName of ['INPUT', 'TEXTAREA', 'SELECT', 'input']) {
      expect(shouldIgnoreKey('j', NO_MODS, { ...PLAIN_TARGET, tagName }, false)).toBe(true);
    }
    expect(shouldIgnoreKey('j', NO_MODS, { ...PLAIN_TARGET, isContentEditable: true }, false)).toBe(
      true,
    );
  });

  it('leaves the keys of a tab bar (arrows, Home, End) to it', () => {
    const inTablist = { ...PLAIN_TARGET, inTablist: true };
    for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End']) {
      expect(shouldIgnoreKey(key, NO_MODS, inTablist, false)).toBe(true);
    }
  });

  it('still reacts to the clicker keys and the letters while a tab has the focus', () => {
    const inTablist = { ...PLAIN_TARGET, inTablist: true };
    for (const key of ['PageDown', 'PageUp', 'j', 'k', 'p', 'f', 'n', 'Escape']) {
      expect(shouldIgnoreKey(key, NO_MODS, inTablist, false)).toBe(false);
    }
    expect(shouldIgnoreKey('?', { ...NO_MODS, shiftKey: true }, inTablist, false)).toBe(false);
  });

  it('ignores everything while a dialog is open, wherever the focus is', () => {
    expect(shouldIgnoreKey('j', NO_MODS, PLAIN_TARGET, true)).toBe(true);
    expect(shouldIgnoreKey('j', NO_MODS, { ...PLAIN_TARGET, inOpenDialog: true }, false)).toBe(
      true,
    );
  });

  it('leaves the horizontal keys to a scrollable table but keeps the stop keys', () => {
    const inTable = { ...PLAIN_TARGET, inScrollRegion: true };
    expect(shouldIgnoreKey('ArrowRight', NO_MODS, inTable, false)).toBe(true);
    expect(shouldIgnoreKey('Home', NO_MODS, inTable, false)).toBe(true);
    expect(shouldIgnoreKey('j', NO_MODS, inTable, false)).toBe(false);
    expect(shouldIgnoreKey('PageDown', NO_MODS, inTable, false)).toBe(false);
  });
});

describe('displayKey', () => {
  it('shows symbols for the arrows and Spanish names for the navigation keys', () => {
    expect(displayKey('ArrowRight')).toBe('→');
    expect(displayKey('PageUp')).toBe('Re Pág');
    expect(displayKey('j')).toBe('j');
  });
});
