/**
 * Pure helpers that turn the app colour variables into Mermaid theme variables. Mermaid's `base`
 * theme only accepts hex colours, so every colour is normalised to `#rrggbb` first.
 */

export interface Palette {
  bg: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  warning: string;
  /** True under `prefers-color-scheme: dark`; only feeds Mermaid's `darkMode` flag. */
  dark: boolean;
}

/** Colour variables of `web/src/styles.css` that the diagrams are built from. */
export const PALETTE_VARIABLES = {
  bg: '--bg',
  surface: '--surface',
  text: '--text',
  muted: '--muted',
  border: '--border',
  accent: '--accent',
  warning: '--warning',
} as const;

type PaletteColour = keyof typeof PALETTE_VARIABLES;

/** Share of the status colour mixed into the surface for a tinted fill. */
export const TINT = 0.16;
/** Stronger tint, for the critical-path bars and the notes of the sequence diagrams. */
export const TINT_STRONG = 0.28;

/** Used only when a colour variable is missing or unreadable (the light values of styles.css). */
export const FALLBACK_PALETTE: Palette = {
  bg: '#f4f6f8',
  surface: '#ffffff',
  text: '#1f2933',
  muted: '#616e7c',
  border: '#cbd2d9',
  accent: '#0f766e',
  warning: '#8a5a00',
  dark: false,
};

export type Rgb = readonly [number, number, number];

const HEX = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const FUNCTIONAL = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[,/]\s*[\d.]+%?\s*)?\)$/i;

function clampChannel(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)));
}

/** Reads `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb(...)` and `rgba(...)`; alpha is ignored. */
export function parseColor(value: string): Rgb | undefined {
  const text = value.trim();
  const hex = HEX.exec(text);
  if (hex?.[1]) {
    const digits = hex[1];
    const full =
      digits.length <= 4 ? Array.from(digits, (digit) => digit + digit).join('') : digits;
    return [
      parseInt(full.slice(0, 2), 16),
      parseInt(full.slice(2, 4), 16),
      parseInt(full.slice(4, 6), 16),
    ];
  }
  const functional = FUNCTIONAL.exec(text);
  if (functional?.[1] && functional[2] && functional[3]) {
    return [
      clampChannel(Number(functional[1])),
      clampChannel(Number(functional[2])),
      clampChannel(Number(functional[3])),
    ];
  }
  return undefined;
}

export function toHex(rgb: Rgb): string {
  return `#${rgb.map((channel) => clampChannel(channel).toString(16).padStart(2, '0')).join('')}`;
}

/** Normalises any colour `parseColor` understands to lowercase `#rrggbb`. */
export function normaliseHex(value: string): string {
  const rgb = parseColor(value);
  if (!rgb) throw new Error(`Unreadable colour: ${value}`);
  return toHex(rgb);
}

/** Linear mix in sRGB: `ratio` is the share of `colorB` (0 gives A, 1 gives B). */
export function mixHex(colorA: string, colorB: string, ratio: number): string {
  const a = parseColor(colorA);
  const b = parseColor(colorB);
  if (!a || !b) throw new Error(`Unreadable colour: ${a ? colorB : colorA}`);
  const share = Math.min(1, Math.max(0, ratio));
  return toHex([
    a[0] * (1 - share) + b[0] * share,
    a[1] * (1 - share) + b[1] * share,
    a[2] * (1 - share) + b[2] * share,
  ]);
}

/**
 * Builds a palette from a reader that returns the resolved colour of a CSS variable. A variable
 * that is missing or unreadable falls back to the light value instead of breaking every diagram.
 */
export function paletteFrom(read: (variable: string) => string, dark: boolean): Palette {
  const palette: Palette = { ...FALLBACK_PALETTE, dark };
  for (const name of Object.keys(PALETTE_VARIABLES) as PaletteColour[]) {
    const rgb = parseColor(read(PALETTE_VARIABLES[name]));
    if (rgb) palette[name] = toHex(rgb);
  }
  return palette;
}

/** Mermaid theme variables are plain strings, plus the boolean `darkMode`. */
export type ThemeVariables = Record<string, string | boolean>;

/**
 * Mermaid `base` theme variables for the palette. Unstatused nodes use the page background, so
 * the "planned" status (filled with the surface colour) reads as hollow next to them.
 */
export function themeVariables(palette: Palette, fontFamily: string): ThemeVariables {
  const { bg, surface, text, muted, border, accent, warning } = palette;
  const accentTint = mixHex(surface, accent, TINT);
  const warningTint = mixHex(surface, warning, TINT);
  const warningStrong = mixHex(surface, warning, TINT_STRONG);
  const mutedTint = mixHex(surface, muted, TINT);
  return {
    darkMode: palette.dark,
    fontFamily,
    background: surface,

    // Flowchart (and the defaults every diagram inherits)
    primaryColor: bg,
    primaryTextColor: text,
    primaryBorderColor: border,
    secondaryColor: accentTint,
    tertiaryColor: surface,
    mainBkg: bg,
    nodeBorder: border,
    nodeTextColor: text,
    textColor: text,
    titleColor: text,
    lineColor: muted,
    clusterBkg: mutedTint,
    clusterBorder: border,
    edgeLabelBackground: surface,

    // Sequence
    actorBkg: bg,
    actorBorder: border,
    actorTextColor: text,
    actorLineColor: muted,
    signalColor: text,
    signalTextColor: text,
    labelBoxBkgColor: surface,
    labelBoxBorderColor: border,
    labelTextColor: text,
    loopTextColor: text,
    noteBkgColor: warningStrong,
    noteBorderColor: warning,
    noteTextColor: text,
    activationBkgColor: accentTint,
    activationBorderColor: accent,

    // State
    stateBkg: bg,
    stateLabelColor: text,
    labelBackgroundColor: surface,
    transitionColor: muted,
    transitionLabelColor: text,
    specialStateColor: muted,
    compositeBackground: surface,
    compositeBorder: border,
    compositeTitleBackground: bg,
    altBackground: surface,

    // Entity relationship
    rowOdd: surface,
    rowEven: bg,
    attributeBackgroundColorOdd: surface,
    attributeBackgroundColorEven: bg,

    // Gantt
    gridColor: border,
    sectionBkgColor: mutedTint,
    altSectionBkgColor: surface,
    sectionBkgColor2: mutedTint,
    taskBkgColor: mutedTint,
    taskBorderColor: muted,
    taskTextColor: text,
    taskTextLightColor: text,
    taskTextDarkColor: text,
    taskTextOutsideColor: text,
    taskTextClickableColor: text,
    activeTaskBkgColor: warningTint,
    activeTaskBorderColor: warning,
    doneTaskBkgColor: accentTint,
    doneTaskBorderColor: accent,
    critBkgColor: warningStrong,
    critBorderColor: text,
    todayLineColor: accent,
  };
}

/** True when the page is rendered under `prefers-color-scheme: dark`. */
export function prefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Resolves a colour variable to something `parseColor` reads. Custom properties come back as
 * written, so a variable declared as a named colour or `hsl()` goes through a probe element,
 * whose computed `color` is always `rgb()`.
 */
function resolveVariable(root: HTMLElement, style: CSSStyleDeclaration, variable: string): string {
  const raw = style.getPropertyValue(variable).trim();
  if (parseColor(raw)) return raw;
  const probe = document.createElement('span');
  probe.style.color = `var(${variable})`;
  root.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return resolved;
}

/** Reads the current palette from the document: the CSS variables switch with the colour scheme. */
export function readPalette(root: HTMLElement = document.documentElement): Palette {
  const style = getComputedStyle(root);
  return paletteFrom((variable) => resolveVariable(root, style, variable), prefersDark());
}

/** The font stack of the app, so the diagrams match the surrounding text. */
export function readFontFamily(root: HTMLElement = document.documentElement): string {
  const family = getComputedStyle(root).fontFamily.trim();
  return family === '' ? 'system-ui, sans-serif' : family;
}
