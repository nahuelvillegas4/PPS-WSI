import { describe, expect, it } from 'vitest';
import { describeRenderError, inspectSvg, parseViewBox, retagSvgIds } from './svgTools';

const GOOD =
  '<svg id="gia-d-3" width="100%" viewBox="0 0 318.5 450" style="max-width: 318px"><style>#gia-d-3 .node{fill:red}</style><marker id="gia-d-3_end"/><path marker-end="url(#gia-d-3_end)"/></svg>';

describe('parseViewBox', () => {
  it('reads the natural size from the root viewBox', () => {
    expect(parseViewBox(GOOD)).toEqual({ width: 318.5, height: 450 });
    expect(parseViewBox('<svg viewBox="-50, -10, 450, 344">')).toEqual({ width: 450, height: 344 });
  });

  it('returns undefined when it is missing or malformed', () => {
    expect(parseViewBox('<svg width="10">')).toBeUndefined();
    expect(parseViewBox('<svg viewBox="0 0 a b">')).toBeUndefined();
    expect(parseViewBox('<svg viewBox="0 0 10">')).toBeUndefined();
  });
});

describe('retagSvgIds', () => {
  it('renames the root id, the scoped selectors and the marker references', () => {
    const copy = retagSvgIds(GOOD, 'gia-d-3', 'gia-v-3');
    expect(copy).not.toContain('gia-d-3');
    expect(copy).toContain('id="gia-v-3"');
    expect(copy).toContain('#gia-v-3 .node');
    expect(copy).toContain('url(#gia-v-3_end)');
  });
});

describe('inspectSvg', () => {
  it('accepts a sized drawing', () => {
    expect(inspectSvg(GOOD)).toBeUndefined();
  });

  it('flags what does not throw but is unusable', () => {
    expect(inspectSvg('<div>no svg</div>')).toMatch(/SVG/);
    expect(inspectSvg('<svg viewBox="0 0 10 10"><text>Syntax error in text</text></svg>')).toMatch(
      /sintaxis/,
    );
    expect(inspectSvg('<svg width="100%">')).toMatch(/viewBox/);
    expect(inspectSvg('<svg viewBox="0 0 0 0">')).toMatch(/nulo/);
  });
});

describe('describeRenderError', () => {
  it('uses the message of an Error, the text of anything else and never an empty string', () => {
    expect(describeRenderError(new Error('  Parse error on line 3  '))).toBe(
      'Parse error on line 3',
    );
    expect(describeRenderError('plain')).toBe('plain');
    expect(describeRenderError(new Error(''))).toMatch(/desconocido/);
  });
});
