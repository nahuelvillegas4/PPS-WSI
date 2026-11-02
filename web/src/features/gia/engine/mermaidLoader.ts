/**
 * Lazy access to Mermaid. The library is a dynamic import so it lands in its own chunks and never
 * weighs on the entry bundle, and it is initialised once per colour scheme (the theme variables
 * differ between light and dark, so a scheme change re-runs `initialize` with the new palette).
 */
import type { Mermaid, MermaidConfig } from 'mermaid';
import { themeVariables, type Palette } from './mermaidTheme';

/** A gantt rendered in a hidden or zero-width container would otherwise get width 0. */
export const GANTT_WIDTH = 1100;

export function buildMermaidConfig(palette: Palette, fontFamily: string): MermaidConfig {
  return {
    startOnLoad: false,
    theme: 'base',
    securityLevel: 'strict',
    fontFamily,
    // Errors throw (the figure shows an error card) instead of drawing Mermaid's own bomb icon.
    suppressErrorRendering: true,
    gantt: { useWidth: GANTT_WIDTH },
    themeVariables: themeVariables(palette, fontFamily),
  };
}

let loading: Promise<Mermaid> | undefined;
let configuredFor: string | undefined;

/** Imports Mermaid once; a failed import (for example a lost chunk) can be retried later. */
export function loadMermaid(): Promise<Mermaid> {
  loading ??= import('mermaid').then(
    (module) => module.default,
    (error: unknown) => {
      loading = undefined;
      throw error;
    },
  );
  return loading;
}

/** Initialises Mermaid for this palette; repeated calls with the same palette do nothing. */
export function configureMermaid(mermaid: Mermaid, palette: Palette, fontFamily: string): void {
  const signature = JSON.stringify([palette, fontFamily]);
  if (signature === configuredFor) return;
  mermaid.initialize(buildMermaidConfig(palette, fontFamily));
  configuredFor = signature;
}
