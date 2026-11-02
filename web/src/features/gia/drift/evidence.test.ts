/**
 * Every source a diagram or a table cites exists in the repository (with `:line` and `#symbol`
 * stripped); `git` and `run` references are checked for format only. A citation to a file that
 * moved or never existed is how a page like this starts to lie.
 */
import { describe, expect, it } from 'vitest';
import { DIAGRAMS, TABLES } from '../model/registry';
import { collectEvidence, findEvidenceProblems } from './checks';
import { allRepoPaths, repoPathExists } from './repoFiles.testing';

const EVIDENCE = collectEvidence([...DIAGRAMS.values()], [...TABLES.values()]);

/** A file, or a folder written with a trailing slash that holds at least one file. */
function existsInRepo(path: string): boolean {
  return (
    repoPathExists(path) || (path.endsWith('/') && allRepoPaths().some((p) => p.startsWith(path)))
  );
}

describe('evidence of the content', () => {
  it('cites sources', () => {
    expect(EVIDENCE.length).toBeGreaterThan(0);
  });

  it('has well-formed refs that resolve to a file of the repository', () => {
    expect(findEvidenceProblems(EVIDENCE, existsInRepo)).toEqual([]);
  });
});
