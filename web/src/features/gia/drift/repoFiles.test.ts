import { describe, expect, it } from 'vitest';
import {
  allRepoPaths,
  findRepoText,
  globToRegExp,
  matchRepoGlob,
  readRepoFile,
  repoPathExists,
} from './repoFiles.testing';

describe('repoFiles helper', () => {
  it('lists repository files with repo-relative forward-slash paths', () => {
    expect(repoPathExists('compose.yaml')).toBe(true);
    expect(repoPathExists('web/package.json')).toBe(true);
    expect(allRepoPaths().every((path) => !path.includes('\\') && !path.startsWith('..'))).toBe(
      true,
    );
  });

  it('leaves out dependencies, build output and local-only folders', () => {
    const paths = allRepoPaths();
    expect(paths.some((path) => path.includes('node_modules/'))).toBe(false);
    expect(paths.some((path) => path.startsWith('data/') || path.startsWith('odd/'))).toBe(false);
    expect(paths.some((path) => path.includes('/bin/') || path.includes('/obj/'))).toBe(false);
  });

  it('reads text with normalised line endings', async () => {
    const compose = await readRepoFile('compose.yaml');
    expect(compose).toContain('services:');
    expect(compose).not.toContain('\r');
    await expect(readRepoFile('web/package-does-not-exist.json')).rejects.toThrow();
  });

  it('matches globs over repo-relative paths', () => {
    expect(globToRegExp('web/src/**').test('web/src/app/App.tsx')).toBe(true);
    expect(globToRegExp('scripts/fetch-samples.*').test('scripts/fetch-samples.sh')).toBe(true);
    expect(globToRegExp('scripts/fetch-samples.*').test('scripts/other.sh')).toBe(false);
    expect(globToRegExp('CODEOWNERS').test('docs/CODEOWNERS')).toBe(false);
    expect(matchRepoGlob('web/src/app/*.tsx')).toContain('web/src/app/App.tsx');
    expect(matchRepoGlob('.github/**')).toEqual([]);
  });

  it('searches raw text under globs, honouring exclusions', async () => {
    const hits = await findRepoText({ in: ['web/src/**'], pattern: 'assertNever' });
    expect(hits).toContain('web/src/app/App.tsx');
    const without = await findRepoText({
      in: ['web/src/**'],
      except: ['web/src/app/**'],
      pattern: 'GiaPage = lazy',
    });
    expect(without).not.toContain('web/src/app/App.tsx');
  });
});
