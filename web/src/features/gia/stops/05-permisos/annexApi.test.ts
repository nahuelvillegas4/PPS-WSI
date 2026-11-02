import { describe, expect, it } from 'vitest';
import { content } from '../../anexos/a1-api';
import { GLOBAL_ADMIN_OPERATIONS, MINIMUM_LABELS, OPERATIONS } from '../../data/operations';
import { repoPathExists } from '../../drift/repoFiles.testing';
import { FACTS } from '../../model/facts';
import type { Cell } from '../../model/types';

const api40 = content.tables[0];

function rowOf(index: number): Record<string, Cell> {
  const row = api40?.rows[index];
  if (!row) throw new Error(`api-40 has no row ${String(index)}`);
  return row;
}

describe('annex A1: the API operations', () => {
  it('is the annex a1-api with the one table api-40 and no diagrams', () => {
    expect(content.section.id).toBe('a1-api');
    expect(content.section.group).toBe('anexo');
    expect(content.section.minutes).toBeUndefined();
    expect(content.diagrams).toEqual([]);
    expect(content.tables.map((table) => table.id)).toEqual(['api-40']);
    expect(content.section.tabs.flatMap((tab) => tab.blocks)).toContainEqual({
      kind: 'table',
      id: 'api-40',
    });
  });

  it('generates one numbered row per operation, in contract order', () => {
    expect(api40?.rows).toHaveLength(FACTS.operations);
    expect(api40?.rows.map((row) => row['n'])).toEqual(
      Array.from({ length: FACTS.operations }, (_, index) => index + 1),
    );
    expect(api40?.columns.map((column) => column.label)).toEqual([
      '#',
      'Método y ruta',
      'Mínimo',
      'Permiso',
      'Ámbito',
      'No miembro',
      'Marcas',
      'Pantalla',
      'Pendiente',
    ]);
  });

  it('shows method and route in monospace, and the gateway access check without a route', () => {
    expect(rowOf(0)['ruta']).toEqual({ mono: 'POST /api/v1/auth/login' });
    const internalIndex = OPERATIONS.findIndex((operation) => operation.area === 'internal');
    expect(rowOf(internalIndex)['ruta']).toBe('GET (interna: consulta de acceso de la pasarela)');
    expect(JSON.stringify(api40?.rows)).not.toContain('/internal');
  });

  it('writes the minimum, permission, scope and non-member answer of each row from OPERATIONS', () => {
    expect(rowOf(0)['minimo']).toBe(MINIMUM_LABELS.anonymous);
    expect(rowOf(0)['permiso']).toBe('—');
    expect(rowOf(0)['ambito']).toBe('—');
    expect(rowOf(0)['noMiembro']).toBe('—');
    const getProject = OPERATIONS.findIndex((operation) => operation.id === 'getProject');
    expect(rowOf(getProject)['minimo']).toBe(MINIMUM_LABELS.viewer);
    expect(rowOf(getProject)['permiso']).toEqual({ mono: 'project.view' });
    expect(rowOf(getProject)['ambito']).toBe('proyecto');
    expect(rowOf(getProject)['noMiembro']).toEqual({ mono: '404' });
    const tile = OPERATIONS.findIndex((operation) => operation.area === 'internal');
    expect(rowOf(tile)['noMiembro']).toEqual({ mono: '403' });
  });

  it('flags the author-only and hand-gated operations in the marks column', () => {
    const marks = (id: string): Cell | undefined =>
      rowOf(OPERATIONS.findIndex((operation) => operation.id === id))['marcas'];
    expect(marks('updateAnnotation')).toBe('solo autor');
    expect(marks('deleteAnnotation')).toBe('solo autor');
    expect(marks('listProjects')).toBe('permiso aplicado a mano');
    expect(marks('authorizeTileRequest')).toBe('permiso aplicado a mano');
    expect(marks('login')).toBe('—');
    expect(api40?.rows.filter((row) => row['marcas'] !== '—')).toHaveLength(4);
  });

  it('marks the operations the SPA calls and totals them in the footer', () => {
    const withScreen = api40?.rows.filter((row) => {
      const cell = row['pantalla'];
      return typeof cell === 'object' && 'yes' in cell && cell.yes === true;
    });
    expect(withScreen).toHaveLength(FACTS.inSpa);
    expect(api40?.footer?.['pantalla']).toBe(
      `${String(FACTS.inSpa)} de ${String(FACTS.operations)}`,
    );
    expect(api40?.footer?.['ruta']).toBe(`${String(FACTS.operations)} operaciones`);
  });

  it('copies what each operation still owes, and a dash for the rest', () => {
    const pending = api40?.rows.map((row) => row['pendiente']) ?? [];
    expect(pending.filter((cell) => cell !== '—')).toHaveLength(8);
    expect(pending.filter((cell) => cell !== '—').every((cell) => typeof cell === 'string')).toBe(
      true,
    );
    expect(pending[0]).toBe('—');
    const exportRow = OPERATIONS.findIndex((operation) => operation.id === 'exportDataset');
    expect(pending[exportRow]).toBe(OPERATIONS[exportRow]?.pending);
  });

  it('says who decides the operations that ask for the global admin: the role in the cookie', () => {
    const callout = content.section.tabs
      .flatMap((tab) => tab.blocks)
      .find((block) => block.kind === 'callout');
    const text = callout && 'text' in callout ? callout.text : '';
    expect(OPERATIONS.filter((operation) => operation.minimum === 'global-admin')).toHaveLength(
      GLOBAL_ADMIN_OPERATIONS,
    );
    expect(text).toContain(
      `Las ${String(GLOBAL_ADMIN_OPERATIONS)} operaciones que piden administración global las decide el rol que viaja en la cookie`,
    );
  });

  it('cites contract and code files that exist, and a short headline with 2 to 4 notes', () => {
    expect(api40?.sources.length).toBeGreaterThan(0);
    for (const evidence of api40?.sources ?? []) {
      expect(repoPathExists(evidence.ref), evidence.ref).toBe(true);
    }
    expect(content.section.headline.length).toBeLessThanOrEqual(90);
    expect(content.section.notes.length).toBeGreaterThanOrEqual(2);
    expect(content.section.notes.length).toBeLessThanOrEqual(4);
    expect(content.section.notes.join(' ')).toContain(String(FACTS.inSpa));
  });
});
