/**
 * Reads repository files from tests. It is the only place of the guide that reaches outside
 * `web/`, and it is never imported by runtime code: the gateway image builds only `web/`, so a
 * runtime import of `contract/` or `docs/` would break that build.
 *
 * It uses Vite's `?raw` globs (no `node:fs`, no `@types/node`). Paths are repo-relative with
 * forward slashes; text is returned with line endings normalised to `\n`.
 */

/**
 * This folder, repo-relative. Vite requires glob patterns to be string literals, so the prefix
 * `../../../../../` (five levels up: the repository root) is written out in each pattern below.
 */
const HERE = ['web', 'src', 'features', 'gia', 'drift'];

/** Every file of the repository (dot-directories included), as lazy loaders keyed by path. */
const ALL_FILES = import.meta.glob(
  [
    '../../../../../**/*',
    '../../../../../.*/**/*',
    '!../../../../../**/node_modules/**',
    '!../../../../../**/bin/**',
    '!../../../../../**/obj/**',
    '!../../../../../**/dist/**',
    '!../../../../../**/.venv/**',
    '!../../../../../**/__pycache__/**',
    '!../../../../../**/.git/**',
    '!../../../../../**/.codegraph/**',
    // Local-only material that is not part of the repository.
    '!../../../../../data/**',
    '!../../../../../odd/**',
  ],
  { eager: false, exhaustive: true },
);

/** Text files whose contents tests may read. */
const TEXT_FILES = import.meta.glob<string>(
  [
    '../../../../../**/*.{cs,csproj,ts,tsx,css,py,conf,yaml,yml,json,md,sh,html,txt,toml}',
    '../../../../../**/Dockerfile',
    '../../../../../.*/**/*.{yaml,yml,json,md}',
    '!../../../../../**/node_modules/**',
    '!../../../../../**/bin/**',
    '!../../../../../**/obj/**',
    '!../../../../../**/dist/**',
    '!../../../../../**/.venv/**',
    '!../../../../../**/__pycache__/**',
    '!../../../../../**/.git/**',
    '!../../../../../**/.codegraph/**',
    '!../../../../../data/**',
    '!../../../../../odd/**',
  ],
  { query: '?raw', import: 'default', eager: false, exhaustive: true },
);

/**
 * Vite keys a match by its shortest relative path from this folder: `../../../app/App.tsx` for
 * a file under `web/src`, `../../../../../compose.yaml` for one at the root. Resolving the
 * `..` segments against `HERE` gives the repo-relative path in both cases.
 */
function toRepoPath(globKey: string): string {
  const parts = [...HERE];
  for (const segment of globKey.split('/')) {
    if (segment === '..') parts.pop();
    else if (segment !== '.' && segment !== '') parts.push(segment);
  }
  return parts.join('/');
}

const PATHS: readonly string[] = Object.keys(ALL_FILES).map(toRepoPath).sort();
const TEXT_LOADERS = new Map<string, () => Promise<string>>(
  Object.entries(TEXT_FILES).map(([key, load]) => [toRepoPath(key), load]),
);

/** Every file of the repository, repo-relative. */
export function allRepoPaths(): readonly string[] {
  return PATHS;
}

export function repoPathExists(path: string): boolean {
  return PATHS.includes(path);
}

/** Converts `**`, `*` and `?` into a regular expression over repo-relative paths. */
export function globToRegExp(glob: string): RegExp {
  let source = '';
  for (let i = 0; i < glob.length; i += 1) {
    const char = glob.charAt(i);
    if (char === '*') {
      if (glob.charAt(i + 1) === '*') {
        const slashFollows = glob.charAt(i + 2) === '/';
        source += slashFollows ? '(?:.*/)?' : '.*';
        i += slashFollows ? 2 : 1;
      } else {
        source += '[^/]*';
      }
    } else if (char === '?') {
      source += '[^/]';
    } else {
      source += char.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${source}$`);
}

/** Repo-relative files matching a glob such as `web/src/features/annotations/**`. */
export function matchRepoGlob(glob: string): string[] {
  const regExp = globToRegExp(glob);
  return PATHS.filter((path) => regExp.test(path));
}

/** Contents of a text file of the repository; throws when the file is not readable text. */
export async function readRepoFile(path: string): Promise<string> {
  const load = TEXT_LOADERS.get(path);
  if (!load) throw new Error(`Not a readable text file of the repository: ${path}`);
  return (await load()).replace(/\r\n/g, '\n');
}

/** Files under `include` globs (minus `except`) whose text matches `pattern`. */
export async function findRepoText(query: {
  in: readonly string[];
  except?: readonly string[];
  pattern: string;
}): Promise<string[]> {
  const include = query.in.map(globToRegExp);
  const exclude = (query.except ?? []).map(globToRegExp);
  const regExp = new RegExp(query.pattern);
  const candidates = [...TEXT_LOADERS.keys()].filter(
    (path) => include.some((re) => re.test(path)) && !exclude.some((re) => re.test(path)),
  );
  const hits: string[] = [];
  for (const path of candidates) {
    if (regExp.test(await readRepoFile(path))) hits.push(path);
  }
  return hits;
}
