import { describe, expect, it } from 'vitest';
import { GANTT_WIDTH, buildMermaidConfig } from './mermaidLoader';
import { FALLBACK_PALETTE, themeVariables } from './mermaidTheme';

describe('buildMermaidConfig', () => {
  const config = buildMermaidConfig(FALLBACK_PALETTE, 'system-ui, sans-serif');

  it('is the strict, manual, base-theme configuration of the guide', () => {
    expect(config.startOnLoad).toBe(false);
    expect(config.theme).toBe('base');
    expect(config.securityLevel).toBe('strict');
    expect(config.fontFamily).toBe('system-ui, sans-serif');
    expect(config.suppressErrorRendering).toBe(true);
  });

  it('gives a gantt a fixed width, so a hidden container does not collapse it to zero', () => {
    expect(config.gantt?.useWidth).toBe(GANTT_WIDTH);
    expect(GANTT_WIDTH).toBe(1100);
  });

  it('carries the theme variables of the palette', () => {
    expect(config.themeVariables).toEqual(
      themeVariables(FALLBACK_PALETTE, 'system-ui, sans-serif'),
    );
  });
});
