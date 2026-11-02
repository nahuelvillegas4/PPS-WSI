import { describe, expect, it } from 'vitest';
import {
  CALLERS,
  CONTRACT_VERSION,
  GLOBAL_ADMIN_OPERATIONS,
  INTERNAL_PATH,
  MINIMUM_ORDER,
  OPERATIONS,
  operationLabel,
  pendingStatus,
  PROJECT_PERMISSION_OPERATIONS,
  reachByRole,
} from '../../data/operations';
import { findRepoText, matchRepoGlob, readRepoFile } from '../../drift/repoFiles.testing';
import { FACTS } from '../../model/facts';
import { countBy } from '../../model/status';
import type { ApiOperation, Minimum } from '../../model/types';
import {
  API_OPENAPI_PATH,
  TILES_OPENAPI_PATH,
  openApiVersion,
  parseOpenApiOperations,
  readFixture,
} from './fixture.testing';

describe('OPERATIONS against the authorization fixture', () => {
  it('has one row per fixture row, in order, equal in every column the fixture has', async () => {
    const fixture = await readFixture();
    expect(OPERATIONS).toHaveLength(fixture.rows.length);
    fixture.rows.forEach((row, index) => {
      const operation = OPERATIONS[index];
      // The gateway's access check keeps no route on the page: its row shows INTERNAL_PATH.
      const expectedPath = row.path.startsWith('/internal') ? INTERNAL_PATH : row.path;
      expect(
        {
          method: operation?.method,
          path: operation?.path,
          minimum: operation?.minimum,
          permission: operation?.permission,
          scope: operation?.scope,
          nonMember: operation?.nonMember,
          ownerOnly: operation?.ownerOnly === true,
          manualGate: operation?.manualGate === true,
        },
        `row ${String(index + 1)} (${row.method} ${row.path})`,
      ).toEqual({
        method: row.method,
        path: expectedPath,
        minimum: row.minimum,
        permission: row.permission,
        scope: row.scope,
        nonMember: row.nonMember,
        ownerOnly: row.ownerOnly,
        manualGate: row.manualGate,
      });
    });
  });

  it('is the 0.2.0 matrix, and the pinned number of operations is its length', async () => {
    const fixture = await readFixture();
    expect(fixture.version).toBe('0.2.0');
    expect(CONTRACT_VERSION).toBe(fixture.version);
    expect(OPERATIONS).toHaveLength(FACTS.operations);
    expect(fixture.rows).toHaveLength(FACTS.operations);
  });

  it('never shows the route of the gateway access check', () => {
    expect(OPERATIONS.filter((operation) => operation.area === 'internal')).toHaveLength(1);
    const internal = OPERATIONS.filter((operation) => operation.path === INTERNAL_PATH);
    expect(internal.map((operation) => operation.id)).toEqual(['authorizeTileRequest']);
    expect(OPERATIONS.some((operation) => operation.path.includes('/internal'))).toBe(false);
    const first = internal[0];
    expect(first && operationLabel(first)).toBe('GET (interna: consulta de acceso de la pasarela)');
  });

  it('has unique operation ids and six counts by minimum: 3, 3, 9, 3, 12 and 10', () => {
    expect(new Set(OPERATIONS.map((operation) => operation.id)).size).toBe(OPERATIONS.length);
    const counts = countBy(OPERATIONS, (operation) => operation.minimum);
    const ordered = MINIMUM_ORDER.map((minimum: Minimum) => counts[minimum] ?? 0);
    expect(ordered).toEqual([3, 3, 9, 3, 12, 10]);
  });

  it('asks for six permissions: 9, 3, 6, 1, 4 and 1 operations, and 16 with none', () => {
    const counts = countBy(OPERATIONS, (operation) => operation.permission ?? 'none');
    expect(counts).toEqual({
      none: 16,
      'project.view': 9,
      'annotation.write': 3,
      'catalog.manage': 6,
      'image.upload': 1,
      'member.manage': 4,
      'dataset.export': 1,
    });
  });

  it('assigns each of the eleven areas the number of operations the page states', () => {
    const counts = countBy(OPERATIONS, (operation) => operation.area);
    expect(counts).toEqual({
      auth: 3,
      users: 4,
      projects: 5,
      members: 4,
      datasets: 5,
      classes: 4,
      images: 5,
      annotations: 5,
      io: 2,
      internal: 1,
      health: 2,
    });
  });
});

describe('OPERATIONS against the OpenAPI files', () => {
  it('has the 40 operationId of api.v1.yaml and the 5 of tiles.v1.yaml', async () => {
    const api = await readRepoFile(API_OPENAPI_PATH);
    const tiles = await readRepoFile(TILES_OPENAPI_PATH);
    expect(api.match(/^\s+operationId:/gm)).toHaveLength(FACTS.operations);
    expect(tiles.match(/^\s+operationId:/gm)).toHaveLength(FACTS.tileOperations);
  });

  it('agrees with api.v1.yaml on version, operationId, method and path', async () => {
    const api = await readRepoFile(API_OPENAPI_PATH);
    expect(openApiVersion(api)).toBe(CONTRACT_VERSION);
    const declared = parseOpenApiOperations(api);
    expect(declared).toHaveLength(OPERATIONS.length);
    declared.forEach((entry, index) => {
      const operation = OPERATIONS[index];
      const expectedPath = operation?.path === INTERNAL_PATH ? undefined : operation?.path;
      expect(operation?.id, `operation ${String(index + 1)}`).toBe(entry.operationId);
      expect(operation?.method, entry.operationId).toBe(entry.method);
      if (expectedPath !== undefined) expect(expectedPath, entry.operationId).toBe(entry.path);
    });
  });
});

describe('reachByRole', () => {
  it('counts what each caller can reach, cumulative: 3, 6, 15, 18, 30 and 40', () => {
    const reach = reachByRole();
    expect(CALLERS.map((caller) => reach[caller])).toEqual([3, 6, 15, 18, 30, 40]);
  });

  it('adds up the operations whose minimum is at or below the caller, from any list', () => {
    const make = (id: string, minimum: Minimum): ApiOperation => ({
      id,
      method: 'GET',
      path: `/${id}`,
      area: 'health',
      minimum,
      permission: null,
      scope: 'none',
      nonMember: null,
      inSpa: false,
    });
    const reach = reachByRole([
      make('a', 'anonymous'),
      make('b', 'any-authenticated'),
      make('c', 'any-authenticated'),
      make('d', 'annotator'),
      make('e', 'global-admin'),
    ]);
    expect(reach).toEqual({
      anonymous: 1,
      'non-member': 3,
      viewer: 3,
      annotator: 4,
      'project-admin': 4,
      'global-admin': 5,
    });
  });

  it('reaches nothing from an empty list', () => {
    expect(CALLERS.map((caller) => reachByRole([])[caller])).toEqual([0, 0, 0, 0, 0, 0]);
  });
});

describe('inSpa against the SPA sources', () => {
  /** `METHOD /api/v1/...` as each SPA function documents the operation it calls. */
  async function documentedCalls(): Promise<string[]> {
    const calls = new Set<string>();
    for (const file of matchRepoGlob('web/src/features/*/*Api.ts')) {
      const source = await readRepoFile(file);
      for (const match of source.matchAll(/`(GET|POST|PATCH|DELETE|PUT) (\/api\/v1\/[^`\s:?]*)/g)) {
        calls.add(`${match[1] ?? ''} ${match[2] ?? ''}`);
      }
    }
    return [...calls].sort();
  }

  it('marks exactly the operations that the SPA api modules document', async () => {
    const expected = OPERATIONS.filter((operation) => operation.inSpa)
      .map((operation) => `${operation.method} ${operation.path}`)
      .sort();
    expect(await documentedCalls()).toEqual(expected);
  });

  it('counts 18 operations, the pinned number', () => {
    expect(OPERATIONS.filter((operation) => operation.inSpa)).toHaveLength(FACTS.inSpa);
  });

  it('finds no call in the SPA api modules that the documentation does not list', async () => {
    let callSites = 0;
    for (const file of matchRepoGlob('web/src/features/*/*Api.ts')) {
      const source = await readRepoFile(file);
      callSites += (source.match(/\bapiFetch\(/g) ?? []).length;
      callSites += (source.match(/\bxhr\.open\(/g) ?? []).length;
    }
    expect(
      callSites,
      'Cambió la cantidad de llamadas de la interfaz a la API: revisá inSpa en data/operations.ts',
    ).toBe(FACTS.inSpa);
  });
});

describe('pending notes', () => {
  it('start with the status they name, and pendingStatus reads the same one', () => {
    const pending = OPERATIONS.filter((operation) => operation.pending !== undefined);
    expect(pending.map((operation) => operation.id)).toEqual([
      'logout',
      'updateUser',
      'addProjectMember',
      'uploadImages',
      'importAnnotations',
      'exportDataset',
      'authorizeTileRequest',
      'apiReady',
    ]);
    for (const operation of pending) {
      const status = pendingStatus(operation);
      expect(status, operation.id).not.toBeNull();
      expect(
        operation.pending?.startsWith(status === 'planned' ? 'PLANIFICADO: ' : 'PARCIAL: '),
      ).toBe(true);
    }
    const login = OPERATIONS.find((operation) => operation.id === 'login');
    expect(login && pendingStatus(login)).toBeNull();
  });

  it('still describe the API: the tripwires of what the notes say is missing', async () => {
    const stillMissing = async (what: string, where: string, pattern: string): Promise<void> => {
      expect(
        await findRepoText({ in: [where], pattern }),
        `La API ya tiene ${what}: actualizá el pendiente en data/operations.ts y el contenido que lo menciona`,
      ).toEqual([]);
    };
    await stillMissing('Clear-Site-Data', 'api/src/**', 'Clear-Site-Data');
    await stillMissing('protected-user', 'api/src/**', 'protected-user|ProtectedUser');
    await stillMissing(
      'el 429 al buscar miembros',
      'api/src/Pps.Api/Controllers/Members/**',
      'TooManyRequests|429',
    );
    await stillMissing(
      '413 o 507 en la subida',
      'api/src/**',
      'payload-too-large|insufficient-storage',
    );
    await stillMissing('storage-key-in-use', 'api/src/**', 'storage-key-in-use');
  });

  it('credit two of them to an ADR and not to the contract, and write the tile cache as conditional', async () => {
    const contract = await readRepoFile(API_OPENAPI_PATH);
    expect(contract).not.toMatch(/Clear-Site-Data/i);
    expect(contract).not.toMatch(/cach[eé]/i);
    const adr = await readRepoFile('docs/adr/0016-autorizacion-por-proyecto-y-sesion.md');
    expect(adr).toContain('el cierre de sesión responde `Clear-Site-Data: "cache"`');
    expect(adr).toContain('Si la puerta falla, se agrega una caché de 5 s');
    const quality = await readRepoFile('docs/arquitectura/05-calidad-y-riesgos.md');
    expect(quality).toContain(
      '| Autorización por tesela sin caché | Simplicidad y seguridad | Si QS-4 no se cumple |',
    );

    const tile = OPERATIONS.find((operation) => operation.id === 'authorizeTileRequest');
    expect(tile?.pending).toContain('solo si no se cumple, agregar una caché de 5 s');
    expect(tile?.pending).not.toContain('caché de 5 s y medición');
    const logout = OPERATIONS.find((operation) => operation.id === 'logout');
    expect(logout?.pending).toContain('(ADR-16, propuesto)');
  });

  it('writes yolo as conditional on spare time and the partial file on upload', () => {
    const exportRow = OPERATIONS.find((operation) => operation.id === 'exportDataset');
    expect(exportRow?.pending).toContain('el ADR-10 lo deja condicional, solo si sobra tiempo');
    const upload = OPERATIONS.find((operation) => operation.id === 'uploadImages');
    expect(upload?.pending).toContain('puede quedar uno parcial en el volumen');
  });

  it('counts how each operation is decided from the rows: 23 by the policy, 10 by the cookie role', () => {
    expect(PROJECT_PERMISSION_OPERATIONS).toBe(23);
    expect(GLOBAL_ADMIN_OPERATIONS).toBe(10);
    expect(OPERATIONS.filter((operation) => operation.manualGate)).toHaveLength(2);
  });

  it('still match the code they describe: yolo, the overwrite on upload and the readiness probe', async () => {
    expect(await readRepoFile('api/src/Pps.Api/Controllers/IO/ExportController.cs')).toContain(
      '"unsupported-format"',
    );
    expect(
      await readRepoFile('api/src/Pps.Infrastructure/Storage/PhysicalStorageService.cs'),
    ).toContain('FileMode.Create');
    const health = await readRepoFile('api/src/Pps.Api/Controllers/Ops/HealthController.cs');
    expect(health).toContain('CanConnectAsync');
    expect(health).toContain('ex.Message');
  });
});
