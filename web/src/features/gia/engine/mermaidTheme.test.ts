import { describe, expect, it } from 'vitest';
import {
  FALLBACK_PALETTE,
  mixHex,
  normaliseHex,
  paletteFrom,
  parseColor,
  themeVariables,
  type Palette,
} from './mermaidTheme';

const HEX = /^#[0-9a-f]{6}$/;

const CUSTOM: Palette = {
  bg: '#101820',
  surface: '#182028',
  text: '#f0f4f8',
  muted: '#8899aa',
  border: '#334455',
  accent: '#22aa99',
  warning: '#ddaa33',
  dark: true,
};

describe('parseColor', () => {
  it('reads every hex length and the rgb() forms', () => {
    expect(parseColor('#0f7')).toEqual([0, 255, 119]);
    expect(parseColor('#0f76')).toEqual([0, 255, 119]);
    expect(parseColor('#0f766e')).toEqual([15, 118, 110]);
    expect(parseColor('#0F766E80')).toEqual([15, 118, 110]);
    expect(parseColor(' rgb(15, 118, 110) ')).toEqual([15, 118, 110]);
    expect(parseColor('rgb(15 118 110 / 50%)')).toEqual([15, 118, 110]);
    expect(parseColor('rgba(15,118,110,0.5)')).toEqual([15, 118, 110]);
  });

  it('rejects what it cannot read', () => {
    expect(parseColor('')).toBeUndefined();
    expect(parseColor('teal')).toBeUndefined();
    expect(parseColor('#12')).toBeUndefined();
    expect(parseColor('var(--accent)')).toBeUndefined();
  });
});

describe('mixHex', () => {
  it('returns the endpoints at ratio 0 and 1 in lowercase #rrggbb', () => {
    expect(mixHex('#0F766E', '#ffffff', 0)).toBe('#0f766e');
    expect(mixHex('#0f766e', '#FFFFFF', 1)).toBe('#ffffff');
  });

  it('mixes linearly per channel', () => {
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mixHex('#000000', '#646464', 0.25)).toBe('#191919');
    expect(mixHex('#ff0000', '#0000ff', 0.5)).toBe('#800080');
  });

  it('clamps the ratio and refuses unreadable colours', () => {
    expect(mixHex('#102030', '#ffffff', -3)).toBe('#102030');
    expect(mixHex('#102030', '#ffffff', 7)).toBe('#ffffff');
    expect(() => mixHex('teal', '#ffffff', 0.5)).toThrow(/teal/);
    expect(() => mixHex('#ffffff', 'nope', 0.5)).toThrow(/nope/);
  });
});

describe('normaliseHex', () => {
  it('expands short forms and converts rgb()', () => {
    expect(normaliseHex('#abc')).toBe('#aabbcc');
    expect(normaliseHex('rgb(31, 41, 51)')).toBe('#1f2933');
  });

  it('refuses an unreadable colour', () => {
    expect(() => normaliseHex('teal')).toThrow(/teal/);
  });
});

describe('paletteFrom', () => {
  it('converts every variable to hex and carries the dark flag', () => {
    const values: Record<string, string> = {
      '--bg': 'rgb(18, 24, 31)',
      '--surface': '#1B242D',
      '--text': '#e4e7eb',
      '--muted': '#9aa5b1',
      '--border': '#3e4c59',
      '--accent': '#3cc4b3',
      '--warning': '#f0c36d',
    };
    const palette = paletteFrom((name) => values[name] ?? '', true);
    expect(palette).toEqual({
      bg: '#12181f',
      surface: '#1b242d',
      text: '#e4e7eb',
      muted: '#9aa5b1',
      border: '#3e4c59',
      accent: '#3cc4b3',
      warning: '#f0c36d',
      dark: true,
    });
  });

  it('falls back to the light value of a missing variable instead of failing', () => {
    const palette = paletteFrom((name) => (name === '--accent' ? '#112233' : ''), false);
    expect(palette.accent).toBe('#112233');
    expect(palette.surface).toBe(FALLBACK_PALETTE.surface);
    expect(palette.dark).toBe(false);
  });
});

describe('themeVariables', () => {
  const FONT = 'system-ui, sans-serif';
  const variables = themeVariables(CUSTOM, FONT);

  it('uses only hex colours for colour variables', () => {
    for (const [name, value] of Object.entries(variables)) {
      if (name === 'darkMode' || name === 'fontFamily') continue;
      expect(value, name).toMatch(HEX);
    }
  });

  it('maps the palette onto the diagram parts', () => {
    expect(variables.darkMode).toBe(true);
    expect(variables.fontFamily).toBe(FONT);
    expect(variables.textColor).toBe(CUSTOM.text);
    expect(variables.lineColor).toBe(CUSTOM.muted);
    expect(variables.nodeBorder).toBe(CUSTOM.border);
    expect(variables.mainBkg).toBe(CUSTOM.bg);
    expect(variables.doneTaskBorderColor).toBe(CUSTOM.accent);
    expect(variables.activeTaskBorderColor).toBe(CUSTOM.warning);
    expect(variables.todayLineColor).toBe(CUSTOM.accent);
  });

  it('follows the palette: another palette changes the colours but not the keys', () => {
    const light = themeVariables(FALLBACK_PALETTE, FONT);
    expect(Object.keys(light)).toEqual(Object.keys(variables));
    expect(light.darkMode).toBe(false);
    expect(light.mainBkg).not.toBe(variables.mainBkg);
  });
});
