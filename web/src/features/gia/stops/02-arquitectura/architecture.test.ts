import { describe, expect, it } from 'vitest';
import {
  allRepoPaths,
  findRepoText,
  matchRepoGlob,
  readRepoFile,
} from '../../drift/repoFiles.testing';
import {
  GLOBAL_ADMIN_OPERATIONS,
  OPERATIONS,
  PROJECT_PERMISSION_OPERATIONS,
} from '../../data/operations';
import { FACTS } from '../../model/facts';
import { FEATURES, type FeatureId } from '../../model/features';
import { STATUS_META } from '../../model/status';
import { content } from './index';
import {
  blockRefs,
  flowchartNodeIds,
  forbiddenInContent,
  forbiddenInSource,
  longLines,
  missingEvidence,
  statusMismatches,
} from './contentChecks.testing';

const { section, diagrams, tables } = content;
const diagram = (id: string) => diagrams.find((item) => item.id === id);

describe('stop 2: section', () => {
  it('has a short headline, 2 to 4 notes and the minutes of the talk', () => {
    expect(section.id).toBe('arquitectura');
    expect(section.headline.length).toBeLessThanOrEqual(90);
    expect(section.notes.length).toBeGreaterThanOrEqual(2);
    expect(section.notes.length).toBeLessThanOrEqual(4);
    expect(section.minutes).toBe(2.5);
  });

  it('offers the four tabs in order', () => {
    expect(section.tabs.map((tab) => tab.label)).toEqual([
      'Contenedores',
      'Contexto',
      'API por dentro',
      'SPA por dentro',
    ]);
  });

  it('shows each of its diagrams once and defines the tables it shows', () => {
    const refs = blockRefs(section);
    expect(refs.diagrams.slice().sort()).toEqual(diagrams.map((item) => item.id).sort());
    expect(diagrams.map((item) => item.id).sort()).toEqual([
      'api-interna',
      'contenedores',
      'contexto',
      'spa-interna',
    ]);
    expect(refs.tables.slice().sort()).toEqual(['contenedores', 'pantallas']);
    expect(tables.map((item) => item.id).sort()).toEqual(['contenedores', 'pantallas']);
  });

  it('uses the verbatim copy for the editor split (C7)', () => {
    const spa = section.tabs.find((tab) => tab.id === 'spa');
    expect(spa?.blocks).toContainEqual({
      kind: 'callout',
      tone: 'honest',
      text: 'Reparto del editor: opción A propuesta, sin aprobación de la supervisión; interfaz sin construir',
    });
  });

  it('offers live links to the catalog and the users screen', () => {
    const spa = section.tabs.find((tab) => tab.id === 'spa');
    const targets = spa?.blocks.flatMap((block) =>
      block.kind === 'liveLink' ? [block.target] : [],
    );
    expect(targets).toEqual(['catalog', 'users']);
  });
});

describe('stop 2: diagrams', () => {
  it.each(diagrams.map((item) => [item.id, item] as const))(
    '%s respects the shape rules',
    (_id, item) => {
      expect(item.title).not.toBe('');
      expect(item.summary.length).toBeGreaterThan(80);
      expect(item.sources.length).toBeGreaterThan(0);
      expect(item.kind).toBe('flowchart');
      expect(item.source.startsWith('flowchart ')).toBe(true);
      expect(forbiddenInSource(item.source)).toEqual([]);
      expect(longLines(item)).toEqual([]);
      expect(flowchartNodeIds(item.source).size).toBeLessThanOrEqual(14);
      expect(item.usesStatus).toBe(item.source.includes(':::'));
      expect(statusMismatches(item.source)).toEqual([]);
      expect(missingEvidence(item.sources)).toEqual([]);
      expect(forbiddenInContent(item)).toEqual([]);
    },
  );

  it('cites only evidence that exists in the repository, tables included', () => {
    for (const table of tables) expect(missingEvidence(table.sources), table.id).toEqual([]);
    expect(forbiddenInContent(tables)).toEqual([]);
    expect(forbiddenInContent(section)).toEqual([]);
  });

  it('draws every planned or undecided item with the glyph its tripwire status gives', () => {
    // The labels say "propuesto" or "sin construir", so these items must still be planned.
    for (const id of [
      'sessionValidator',
      'csrfGuard',
      'editor',
      'yolo',
      'classesScreen',
    ] as const) {
      expect(FEATURES[id].status, id).toBe('planned');
    }
    const glyph = (id: FeatureId) => STATUS_META[FEATURES[id].status].glyph;
    const api = diagram('api-interna')?.source ?? '';
    expect(api).toContain(`"${glyph('sessionValidator')} SessionValidator`);
    expect(api).toContain(`"${glyph('csrfGuard')} FetchMetadataGuard`);
    const spa = diagram('spa-interna')?.source ?? '';
    expect(spa).toContain(`p_annotations["${glyph('editor')} annotations`);
    const context = diagram('contexto')?.source ?? '';
    expect(context).toContain(`yolo["${glyph('yolo')} YOLO<br/>condicional, ADR-10"]`);
    expect(context).toContain('srv["? Servidor');
  });
});

describe('stop 2: the API inside', () => {
  const controllers = matchRepoGlob('api/src/Pps.Api/Controllers/**/*Controller.cs');

  it('names the number of controllers and operations the pinned facts say', () => {
    expect(controllers).toHaveLength(FACTS.controllers);
    const source = diagram('api-interna')?.source ?? '';
    expect(source).toContain(`Controladores: ${FACTS.controllers}`);
    expect(source).toContain(`${FACTS.operations} operaciones`);
  });

  it('draws only classes that exist in the code', () => {
    const names = [
      'AccessGuardFilter',
      'AccessPolicy',
      'EfProjectAccessReader',
      'GeometryValidator',
      'CricImporter',
      'InternalJsonExporter',
      'CocoExporter',
      'PhysicalStorageService',
      'TilesImageInspector',
    ];
    const source = diagram('api-interna')?.source ?? '';
    for (const name of names.filter((item) => !item.includes('Exporter'))) {
      expect(source, name).toContain(name);
    }
    for (const name of names) {
      expect(
        allRepoPaths().some((path) => path.endsWith(`/${name}.cs`)),
        `${name}.cs`,
      ).toBe(true);
    }
  });

  it('keeps the decision function pure and the guard closed', async () => {
    const policy = await readRepoFile('api/src/Pps.Domain/Access/AccessPolicy.cs');
    expect(policy).toContain('public static class AccessPolicy');
    expect(policy).not.toMatch(/using Microsoft\.(EntityFrameworkCore|AspNetCore)/);
    const guard = await readRepoFile('api/src/Pps.Api/Common/Access/AccessGuardFilter.cs');
    expect(guard).toContain('!= 1');
    expect(guard).toContain('ForbiddenProblemException');
  });

  it('counts how each operation is decided: 23 by the policy, 10 by the role in the cookie, 4 and 3 by hand', async () => {
    let requirePermission = 0;
    let authenticatedOnly = 0;
    for (const path of controllers) {
      const source = await readRepoFile(path);
      requirePermission += (source.match(/\[RequirePermission\(/g) ?? []).length;
      authenticatedOnly += (source.match(/\[AuthenticatedOnly\]/g) ?? []).length;
    }
    expect(requirePermission).toBe(PROJECT_PERMISSION_OPERATIONS);
    const byHand = OPERATIONS.filter(
      (operation) => operation.minimum === 'any-authenticated' || operation.manualGate === true,
    ).length;
    expect(authenticatedOnly).toBe(byHand);
    const anonymous = OPERATIONS.filter((operation) => operation.minimum === 'anonymous').length;
    expect(PROJECT_PERMISSION_OPERATIONS + GLOBAL_ADMIN_OPERATIONS + byHand + anonymous).toBe(
      FACTS.operations,
    );
    expect([PROJECT_PERMISSION_OPERATIONS, GLOBAL_ADMIN_OPERATIONS, byHand, anonymous]).toEqual([
      23, 10, 4, 3,
    ]);

    // The page says it: the filter asks the policy only for the first group.
    const callout = section.tabs
      .find((tab) => tab.id === 'api')
      ?.blocks.find((block) => block.kind === 'callout');
    const text = callout && 'text' in callout ? callout.text : '';
    expect(text).toContain(
      `las ${String(PROJECT_PERMISSION_OPERATIONS)} operaciones con permiso de proyecto`,
    );
    expect(text).toContain(
      `Las ${String(GLOBAL_ADMIN_OPERATIONS)} de administración global las decide el rol de la cookie`,
    );
    const summary = diagram('api-interna')?.summary ?? '';
    expect(summary).toContain(`Las ${String(GLOBAL_ADMIN_OPERATIONS)} de administración global`);
    expect(summary).not.toContain(
      'pasan por un único filtro de acceso que falla cerrado y consulta',
    );
  });

  it('tells where the decision is applied by hand', async () => {
    const tileAccess = await readRepoFile(
      'api/src/Pps.Api/Controllers/Internal/TileAccessController.cs',
    );
    expect(tileAccess).toContain('AccessPolicy.Decide');
    const projects = await readRepoFile(
      'api/src/Pps.Api/Controllers/Catalog/ProjectsController.cs',
    );
    expect(projects).not.toContain('AccessPolicy.Decide');
    const callout = section.tabs
      .find((tab) => tab.id === 'api')
      ?.blocks.find((block) => block.kind === 'callout');
    expect(callout && 'text' in callout ? callout.text : '').toContain('a mano');
  });

  it('does not build the proposed session validator or fetch-metadata guard yet', async () => {
    const hits = await findRepoText({
      in: ['api/src/**'],
      pattern: 'SessionValidator|FetchMetadataGuard',
    });
    expect(hits).toEqual([]);
    expect(FEATURES.sessionValidator.status).toBe('planned');
    expect(FEATURES.csrfGuard.status).toBe('planned');
  });
});

describe('stop 2: the SPA inside', () => {
  const source = diagram('spa-interna')?.source ?? '';
  const folders = new Set(
    allRepoPaths()
      .filter((path) => path.startsWith('web/src/features/'))
      .flatMap((path) => path.split('/').slice(3, 4)),
  );

  it('has one node per folder of web/src/features, plus the planned editor', () => {
    const drawn = [...source.matchAll(/^\s*f_(\w+)\[/gm)].flatMap((match) => match[1] ?? []);
    expect(drawn.sort()).toEqual([...folders].sort());
    expect(source).toContain('p_annotations[');
    expect(folders.has('annotations')).toBe(false);
  });

  it('shows the three planned screens with one status', () => {
    expect(FEATURES.classesScreen.status).toBe(FEATURES.importScreen.status);
    expect(FEATURES.classesScreen.status).toBe(FEATURES.exportScreen.status);
  });

  it('draws the shared client only from folders that import it', async () => {
    const drawn = [...source.matchAll(/^\s*f_(\w+) --> shared$/gm)].flatMap((m) => m[1] ?? []);
    const importing = await findRepoText({
      in: ['web/src/features/*/*.ts', 'web/src/features/*/*.tsx'],
      except: ['web/src/features/gia/**', 'web/src/**/*.test.ts'],
      pattern: "from '\\.\\./\\.\\./shared/api'",
    });
    const folderOf = (path: string) => path.split('/')[3] ?? '';
    expect([...new Set(importing.map(folderOf))].sort()).toEqual(drawn.sort());
  });

  it('keeps OpenSeadragon behind a single adapter', async () => {
    const hits = await findRepoText({
      in: ['web/src/**'],
      pattern: "from\\s+'openseadragon'",
    });
    expect(hits).toEqual(['web/src/features/viewer/OsdImageViewer.ts']);
  });

  it('draws the edges the code has: the catalog uses upload and the rules, the app lazy-loads the guide', async () => {
    const catalog = await readRepoFile('web/src/features/catalog/CatalogPage.tsx');
    expect(catalog).toContain("from '../upload/UploadImagesModal'");
    expect(catalog).toContain("from '../access/access'");
    expect(catalog).toContain('can(');
    const app = await readRepoFile('web/src/app/App.tsx');
    expect(app).toContain("import('../features/gia/GiaPage')");
  });

  it('describes the access rules as hiding controls, as the code says', async () => {
    const access = await readRepoFile('web/src/features/access/access.ts');
    expect(access).toContain('This only hides');
  });
});
