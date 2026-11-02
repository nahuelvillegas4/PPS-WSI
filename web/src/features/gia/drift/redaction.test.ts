/**
 * The guide ships in the static bundle, so everything the audience can read is public. This scans
 * every string of the content (sections, tables, diagram sources, evidence notes) for credentials,
 * internal names, ports and the internal route.
 */
import { describe, expect, it } from 'vitest';
import { DIAGRAMS, SECTIONS, TABLES } from '../model/registry';
import { LEAK_DENYLIST, contentStrings, findDenied, findEnvValueLeaks, parseEnv } from './checks';
import { readRepoFile } from './repoFiles.testing';

const STRINGS = contentStrings({
  sections: SECTIONS,
  diagrams: [...DIAGRAMS.values()],
  tables: [...TABLES.values()],
});

describe('leak denylist over the content', () => {
  it('scans the whole content', () => {
    expect(STRINGS.length).toBeGreaterThan(0);
    expect(STRINGS.some((hit) => hit.path.startsWith('sections'))).toBe(true);
  });

  it('has no credential, internal name, port, header or internal route', () => {
    expect(findDenied(STRINGS, LEAK_DENYLIST)).toEqual([]);
  });

  it('has no value of the .env file (the check is skipped when the file is not readable)', async () => {
    let env: string;
    try {
      env = await readRepoFile('.env');
    } catch {
      return;
    }
    // Names the variable, never its value.
    expect(findEnvValueLeaks(parseEnv(env), STRINGS)).toEqual([]);
  });
});
