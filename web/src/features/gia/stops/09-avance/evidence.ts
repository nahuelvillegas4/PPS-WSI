/**
 * Turns the repo paths a row cites into `Evidence` entries, so the text shown in a cell and the
 * sources the evidence test checks come from the same list and cannot drift apart.
 */
import type { Evidence, EvidenceKind } from '../../model/status';

/** The kind of evidence a repo path is: an ADR, a document, the contract, a test, a config or code. */
export function evidenceKind(path: string): EvidenceKind {
  const file = path.replace(/:\d+(?:-\d+)?$/, '');
  if (file.startsWith('docs/adr/')) return 'adr';
  if (file.endsWith('.md')) return 'doc';
  if (file.startsWith('contract/')) return 'contract';
  if (/(^|\/)tests?\/|\.test\.[a-z]+$/.test(file)) return 'test';
  if (/^compose[\w.-]*\.yaml$/.test(file) || file.startsWith('deploy/')) return 'config';
  return 'code';
}

/** One entry per distinct path, in order of first use. */
export function evidenceOf(refs: readonly string[]): Evidence[] {
  return [...new Set(refs)].map((ref) => ({ kind: evidenceKind(ref), ref }));
}
