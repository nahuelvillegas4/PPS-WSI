import { describe, expect, it } from 'vitest';
import { readRepoFile } from '../drift/repoFiles.testing';
import { FEATURES } from '../model/features';
import { CLAIM_PATTERNS, LEAK_PATTERNS, matchesOf } from '../stops/10-final/unitChecks.testing';
import {
  DESIGN_TAG,
  WIREFRAMES,
  WIREFRAME_BANNER,
  elementsOf,
  formatSourceTag,
  regionsIn,
  type WireframeId,
} from './wireframeSpec';

const IDS: readonly WireframeId[] = ['editor', 'import', 'export', 'classes'];

/** `operationId` -> HTTP method, read from the paths of the contract file. */
async function contractOperations(): Promise<Map<string, string>> {
  const yaml = await readRepoFile('contract/openapi/api.v1.yaml');
  const operations = new Map<string, string>();
  let method = '';
  for (const line of yaml.split('\n')) {
    const methodMatch = /^ {4}(get|post|put|patch|delete):\s*$/.exec(line);
    if (methodMatch?.[1] !== undefined) method = methodMatch[1].toUpperCase();
    const idMatch = /^ {6}operationId:\s*(\w+)\s*$/.exec(line);
    if (idMatch?.[1] !== undefined) operations.set(idMatch[1], method);
  }
  return operations;
}

describe('wireframe content', () => {
  it('describes the four proposed screens', () => {
    expect(Object.keys(WIREFRAMES).sort()).toEqual([...IDS].sort());
    for (const id of IDS) expect(WIREFRAMES[id].id).toBe(id);
  });

  it('says in its banner that the sketch is a proposal without an interface specification', () => {
    expect(WIREFRAME_BANNER).toBe(
      'PROPUESTA, no implementado; no hay especificación de interfaz en el repositorio',
    );
  });

  it.each(IDS)(
    'tags every element of the %s sketch with a contract operation or a proposal',
    (id) => {
      const elements = elementsOf(WIREFRAMES[id]);
      expect(elements.length).toBeGreaterThan(0);
      for (const element of elements) {
        const tag = formatSourceTag(element.source);
        expect(
          tag === DESIGN_TAG || /^(?:GET|POST|PATCH|DELETE) [A-Za-z]+(?: · .+)?$/.test(tag),
        ).toBe(true);
        expect(element.label.length).toBeGreaterThan(0);
      }
    },
  );

  it.each(IDS)('gives every element of the %s sketch a unique id', (id) => {
    const ids = elementsOf(WIREFRAMES[id]).map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(IDS)('places the %s sketch in known areas, with a body to look at', (id) => {
    const spec = WIREFRAMES[id];
    expect(regionsIn(spec, 'main').length + regionsIn(spec, 'side').length).toBeGreaterThan(0);
    const placed = (['top', 'main', 'side', 'bottom'] as const).flatMap((area) =>
      regionsIn(spec, area),
    );
    expect(placed).toHaveLength(spec.regions.length);
  });

  it('formats a tag as method and operation, with the detail after a dot, or as the proposal', () => {
    expect(formatSourceTag({ kind: 'operation', method: 'GET', operationId: 'listClasses' })).toBe(
      'GET listClasses',
    );
    expect(
      formatSourceTag({
        kind: 'operation',
        method: 'POST',
        operationId: 'importAnnotations',
        detail: 'dryRun',
      }),
    ).toBe('POST importAnnotations · dryRun');
    expect(formatSourceTag({ kind: 'design' })).toBe('propuesta de diseño');
  });
});

describe('wireframes against the contract', () => {
  it('names only operations that exist in api.v1.yaml, with the method the contract gives them', async () => {
    const operations = await contractOperations();
    expect(operations.size).toBeGreaterThan(30);
    for (const id of IDS) {
      for (const element of elementsOf(WIREFRAMES[id])) {
        if (element.source.kind !== 'operation') continue;
        expect(operations.get(element.source.operationId), `${id}/${element.id}`).toBe(
          element.source.method,
        );
      }
    }
  });

  it('draws the editor with the pieces the design lists', () => {
    const editor = WIREFRAMES.editor;
    const tags = elementsOf(editor).map((element) => formatSourceTag(element.source));
    const byId = Object.fromEntries(elementsOf(editor).map((element) => [element.id, element]));
    expect(byId.tools?.items?.map((item) => item.label)).toEqual([
      'Seleccionar',
      'Rectángulo',
      'Polígono',
    ]);
    expect(tags).toContain('GET listClasses');
    expect(tags).toContain('GET listAnnotations · author');
    expect(tags).toContain('PATCH updateAnnotation · 412');
    expect(byId.canvas?.source.kind).toBe('design');
  });

  it('draws the import sketch with a dry run on by default, and only for the global administration', () => {
    const elements = elementsOf(WIREFRAMES.import);
    const dryRun = elements.find((element) => element.kind === 'checkbox');
    expect(dryRun && formatSourceTag(dryRun.source)).toBe('POST importAnnotations · dryRun');
    expect(dryRun?.label).toContain('activada por defecto');
    expect(elements.some((e) => e.label.includes('administración global'))).toBe(true);
  });

  it('draws YOLO disabled while the tripwire says it is not built', () => {
    const format = elementsOf(WIREFRAMES.export).find((element) => element.id === 'format');
    const yolo = format?.items?.find((item) => item.label.startsWith('YOLO'));
    expect(yolo?.disabled).toBe(FEATURES.yolo.status !== 'done');
    expect(yolo?.label).toContain('planificado');
    expect(format?.items?.filter((item) => item.disabled)).toHaveLength(1);
  });

  it('draws the class screen with the conflict of a class in use', () => {
    const tags = elementsOf(WIREFRAMES.classes).map((element) => formatSourceTag(element.source));
    expect(tags).toContain('DELETE deleteClass · 409 class-in-use');
    expect(tags).toContain('POST createClass · displayOrder');
  });

  it('never claims approval, acceptance or protection, and leaks no secret or port', () => {
    expect(matchesOf(WIREFRAMES, CLAIM_PATTERNS)).toEqual([]);
    expect(matchesOf(WIREFRAMES, LEAK_PATTERNS)).toEqual([]);
  });
});
