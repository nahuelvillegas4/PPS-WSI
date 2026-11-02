import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Wireframe } from './Wireframes';
import {
  WIREFRAMES,
  WIREFRAME_BANNER,
  elementsOf,
  formatSourceTag,
  type WireframeId,
} from './wireframeSpec';

const IDS: readonly WireframeId[] = ['editor', 'import', 'export', 'classes'];

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function render(id: WireframeId): string {
  return renderToStaticMarkup(createElement(Wireframe, { id }));
}

describe('Wireframe', () => {
  it.each(IDS)('shows the proposal banner and the title of the %s sketch', (id) => {
    const html = render(id);
    expect(html).toContain(escapeHtml(WIREFRAME_BANNER));
    expect(html).toContain(escapeHtml(WIREFRAMES[id].title));
    expect(html).toContain(`data-wireframe="${id}"`);
  });

  it.each(IDS)('renders one source tag per element in the %s sketch', (id) => {
    const html = render(id);
    const elements = elementsOf(WIREFRAMES[id]);
    expect(html.match(/class="gia-wf-tag"/g)).toHaveLength(elements.length);
    for (const element of elements) {
      expect(html).toContain(escapeHtml(formatSourceTag(element.source)));
      expect(html).toContain(escapeHtml(element.label));
    }
  });

  it('marks a tag as a design proposal or as a contract operation', () => {
    const html = render('editor');
    expect(html).toContain('data-source="design"');
    expect(html).toContain('data-source="operation"');
  });

  it('renders the disabled YOLO option of the export sketch as disabled', () => {
    const html = render('export');
    expect(html).toMatch(/data-disabled="true">YOLO/);
    expect(html).toMatch(/data-disabled="false">COCO/);
  });

  it('does not render anything interactive: a sketch has no buttons, links or inputs', () => {
    for (const id of IDS) {
      expect(render(id)).not.toMatch(/<(?:button|a|input|select|textarea|form)\b/);
    }
  });
});
