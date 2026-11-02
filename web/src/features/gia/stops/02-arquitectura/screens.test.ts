import { describe, expect, it } from 'vitest';
import { readRepoFile } from '../../drift/repoFiles.testing';
import { FACTS } from '../../model/facts';
import { FEATURES, type FeatureId } from '../../model/features';
import { parseRoute, type Route } from '../../../../shared/router';
import { SCREENS, type OperationRef } from './screens';
import { tables } from './tables';

/** Adding a route to the router stops this file from compiling until the page documents it. */
const ROUTE_NAMES: Record<Route['name'], true> = {
  catalog: true,
  viewer: true,
  members: true,
  users: true,
  gia: true,
};

const table = tables.find((item) => item.id === 'pantallas');
const app = await readRepoFile('web/src/app/App.tsx');
const contracts = {
  api: await readRepoFile('contract/openapi/api.v1.yaml'),
  tiles: await readRepoFile('contract/openapi/tiles.v1.yaml'),
};

/** Whether the OpenAPI text has `method` under the path key `path`. */
function hasOperation(operation: OperationRef): boolean {
  const lines = contracts[operation.contract].split('\n');
  const start = lines.findIndex((line) => line === `  ${operation.path}:`);
  if (start === -1) return false;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^ {2}\S/.test(line));
  const block = end === -1 ? rest : rest.slice(0, end);
  return block.includes(`    ${operation.method.toLowerCase()}:`);
}

describe('pantallas against the router', () => {
  it('documents a screen for every route of the router, and only those', () => {
    const documented = new Set(SCREENS.flatMap((screen) => (screen.route ? [screen.route] : [])));
    expect([...documented].sort()).toEqual(Object.keys(ROUTE_NAMES).sort());
  });

  it('resolves every documented address to its route through parseRoute', () => {
    for (const screen of SCREENS) {
      if (screen.sample === null) {
        expect(screen.route, `${screen.id} has no address, so no route`).toBeNull();
        continue;
      }
      expect(parseRoute(screen.sample, '').name, screen.id).toBe(screen.route);
      const id = /\d+/.exec(screen.sample)?.[0] ?? '';
      expect(screen.url.replace('{id}', id), `${screen.id}: url and sample agree`).toBe(
        screen.sample,
      );
    }
  });

  it('keeps a case in App.tsx for each route of a screen that exists', () => {
    for (const screen of SCREENS) {
      if (screen.kind === 'planned' || screen.route === null) continue;
      expect(app, `${screen.id} needs a case for '${screen.route}'`).toContain(
        `case '${screen.route}':`,
      );
    }
  });

  it('pins who sees the users screen and the guide to the guard of App.tsx', () => {
    const guard = app.split('\n').find((line) => line.includes('const hidden ='));
    expect(guard).toBeDefined();
    expect(guard).toContain("route.name === 'users'");
    expect(guard).toContain("route.name === 'gia'");
    expect(guard).toContain('!isGlobalAdmin');
    // The members screen has no such guard: the table says anyone who knows the address enters.
    expect(guard).not.toContain('members');
  });
});

describe('pantallas as a table', () => {
  it('has one row per screen, in order, and counts the built product screens from them', () => {
    expect(table?.rows.map((row) => row.screen)).toEqual(SCREENS.map((screen) => screen.name));
    const built = SCREENS.filter((screen) => screen.kind === 'product');
    expect(built.map((screen) => screen.id)).toEqual([
      'login',
      'catalog',
      'viewer',
      'users',
      'members',
    ]);
    expect(built).toHaveLength(FACTS.screens);
  });

  it('counts built screens, the guide and planned screens in the footer', () => {
    expect(table?.footer?.screen).toBe(`${FACTS.screens} construidas, 1 guía y 4 planificadas`);
  });

  it('takes the status of each planned screen from the tripwire registry', () => {
    const feature: Record<string, FeatureId> = {
      editor: 'editor',
      classes: 'classesScreen',
      import: 'importScreen',
      export: 'exportScreen',
    };
    const planned = SCREENS.filter((screen) => screen.kind === 'planned');
    expect(planned.map((screen) => screen.id).sort()).toEqual(Object.keys(feature).sort());
    for (const screen of planned) {
      const id = feature[screen.id];
      expect(id).toBeDefined();
      if (id) expect(screen.status, screen.id).toBe(FEATURES[id].status);
    }
  });

  it('never presents a screen that is not built as done, and gives it no address', () => {
    for (const screen of SCREENS.filter((item) => item.kind === 'planned')) {
      expect(screen.status).not.toBe('done');
      expect(screen.route).toBeNull();
      expect(screen.sample).toBeNull();
    }
    for (const screen of SCREENS.filter((item) => item.kind !== 'planned')) {
      expect(screen.status).not.toBe('planned');
    }
  });

  it('only cites operations that exist in the contracts', () => {
    for (const screen of SCREENS) {
      for (const operation of screen.ops) {
        expect(hasOperation(operation), `${screen.id}: ${operation.method} ${operation.path}`).toBe(
          true,
        );
      }
    }
  });

  it('gives the planned screens the operations their permission needs', () => {
    const paths = (id: string) =>
      SCREENS.find((screen) => screen.id === id)?.ops.map((op) => `${op.method} ${op.path}`);
    expect(paths('import')).toEqual(['POST /api/v1/datasets/{datasetId}/imports']);
    expect(paths('export')).toEqual(['GET /api/v1/datasets/{datasetId}/export']);
    expect(paths('classes')).toHaveLength(4);
    expect(paths('editor')).toContain('POST /api/v1/images/{imageId}/annotations');
  });
});
