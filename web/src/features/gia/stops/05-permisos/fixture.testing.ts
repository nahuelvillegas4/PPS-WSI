/**
 * Readers of the contract files the permissions stop is checked against. Tests only: it goes
 * through `drift/repoFiles.testing.ts` and must never be imported by runtime code.
 */
import { readRepoFile } from '../../drift/repoFiles.testing';

export const FIXTURE_PATH = 'contract/fixtures/authorization-matrix.json';
export const API_OPENAPI_PATH = 'contract/openapi/api.v1.yaml';
export const TILES_OPENAPI_PATH = 'contract/openapi/tiles.v1.yaml';

export interface FixtureRow {
  method: string;
  path: string;
  minimum: string;
  permission: string | null;
  scope: string;
  nonMember: number | null;
  ownerOnly: boolean;
  manualGate: boolean;
}

export interface Fixture {
  version: string;
  roles: { global: string[]; project: string[] };
  /** Permission key to its minimum project role. */
  permissions: Record<string, string>;
  rows: FixtureRow[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function field(record: Record<string, unknown>, key: string): unknown {
  return record[key];
}

function text(record: Record<string, unknown>, key: string): string {
  const value = field(record, key);
  if (typeof value !== 'string') throw new Error(`The fixture field "${key}" is not a string`);
  return value;
}

function textOrNull(record: Record<string, unknown>, key: string): string | null {
  const value = field(record, key);
  if (value === null) return null;
  if (typeof value !== 'string') throw new Error(`The fixture field "${key}" is not a string`);
  return value;
}

function textList(value: unknown, what: string): string[] {
  if (!Array.isArray(value)) throw new Error(`The fixture ${what} is not a list`);
  const items: unknown[] = value;
  return items.map((item) => {
    if (typeof item !== 'string') throw new Error(`The fixture ${what} has a non-string item`);
    return item;
  });
}

function parseRow(value: unknown): FixtureRow {
  if (!isRecord(value)) throw new Error('A fixture row is not an object');
  const nonMember = field(value, 'nonMember');
  if (nonMember !== null && typeof nonMember !== 'number') {
    throw new Error('The fixture field "nonMember" is neither a number nor null');
  }
  return {
    method: text(value, 'method'),
    path: text(value, 'path'),
    minimum: text(value, 'minimum'),
    permission: textOrNull(value, 'permission'),
    scope: text(value, 'scope'),
    nonMember,
    ownerOnly: field(value, 'ownerOnly') === true,
    manualGate: field(value, 'manualGate') === true,
  };
}

export function parseFixture(raw: string): Fixture {
  const data: unknown = JSON.parse(raw);
  if (!isRecord(data)) throw new Error('The fixture is not an object');
  const rows = field(data, 'rows');
  const roles = field(data, 'roles');
  const permissions = field(data, 'permissions');
  if (!Array.isArray(rows)) throw new Error('The fixture has no rows');
  if (!isRecord(roles) || !isRecord(permissions)) throw new Error('The fixture has no roles');
  const rowList: unknown[] = rows;
  return {
    version: text(data, 'version'),
    roles: {
      global: textList(field(roles, 'global'), 'global roles'),
      project: textList(field(roles, 'project'), 'project roles'),
    },
    permissions: Object.fromEntries(
      Object.entries(permissions).map(([key, minimum]) => {
        if (typeof minimum !== 'string') throw new Error(`Permission ${key} has no minimum`);
        return [key, minimum];
      }),
    ),
    rows: rowList.map(parseRow),
  };
}

export async function readFixture(): Promise<Fixture> {
  return parseFixture(await readRepoFile(FIXTURE_PATH));
}

export interface OpenApiOperation {
  method: string;
  path: string;
  operationId: string;
}

/** Operations of an OpenAPI file in document order, read line by line (no YAML parser needed). */
export function parseOpenApiOperations(yaml: string): OpenApiOperation[] {
  const found: OpenApiOperation[] = [];
  let path: string | null = null;
  let method: string | null = null;
  for (const line of yaml.split('\n')) {
    const pathMatch = /^ {2}(\/\S*):\s*$/.exec(line);
    if (pathMatch) {
      path = pathMatch[1] ?? null;
      method = null;
      continue;
    }
    const methodMatch = /^ {4}(get|post|patch|delete|put):\s*$/.exec(line);
    if (methodMatch) {
      method = (methodMatch[1] ?? '').toUpperCase();
      continue;
    }
    const idMatch = /^\s+operationId:\s*(\S+)/.exec(line);
    if (idMatch && path !== null && method !== null) {
      found.push({ method, path, operationId: idMatch[1] ?? '' });
    }
  }
  return found;
}

/** `info.version` of an OpenAPI file. */
export function openApiVersion(yaml: string): string | undefined {
  return /^ {2}version:\s*(\S+)/m.exec(yaml)?.[1];
}
