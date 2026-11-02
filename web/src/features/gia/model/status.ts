/**
 * Status vocabulary of the guide page. Every item the page shows as built, partly built or
 * planned carries one of these, and every total on the page is counted from rows, never typed.
 */

/** Implementation status. Encoded with fill + outline + glyph so it survives a projector. */
export type Status = 'done' | 'partial' | 'planned' | 'unknown';

export interface StatusMeta {
  label: string;
  glyph: string;
  cssClass: Status;
}

export const STATUS_META: Record<Status, StatusMeta> = {
  done: { label: 'Implementado', glyph: '●', cssClass: 'done' },
  partial: { label: 'Parcial', glyph: '◐', cssClass: 'partial' },
  planned: { label: 'Planificado', glyph: '○', cssClass: 'planned' },
  unknown: { label: 'Sin decidir', glyph: '?', cssClass: 'unknown' },
};

export type EvidenceKind =
  'code' | 'test' | 'contract' | 'adr' | 'doc' | 'config' | 'git' | 'run' | 'manual';

/**
 * Where a claim comes from. `ref` is a repo-relative `path[:line[-line]]`, or `git:<sha>`, or
 * `run:<YYYY-MM-DD> <what>`. Path-like kinds are checked against the repository by a test.
 */
export interface Evidence {
  kind: EvidenceKind;
  ref: string;
  note?: string;
}

/** Decision axis of an ADR. Never folded into `Status`: decided and built are different things. */
export type Decision = 'DECIDIDO' | 'PROPUESTO' | 'PENDIENTE';

/** Approval axis of the scope change. Nothing in the repository records it today. */
export type Approval = 'NO_REGISTRADA' | 'PENDIENTE' | 'REGISTRADA';

/** State of a requirement of the two PPS statements; `not-started` is shown as planned. */
export type ReqState = 'implemented' | 'partial' | 'planned' | 'not-started';

/** A measured number: it is a record of an execution, not a fact derived from code. */
export interface Measured {
  value: number | string;
  asOf: string;
  commit: string;
  method: string;
  caveat?: string;
}

/** The moment the hand-written facts of the page were last checked against the repository. */
export const SNAPSHOT = { commit: '2584cfc', date: '2026-11-02', label: '02/11/2026' } as const;

export function toStatus(state: ReqState): Status {
  switch (state) {
    case 'implemented':
      return 'done';
    case 'partial':
      return 'partial';
    case 'planned':
    case 'not-started':
      return 'planned';
  }
}

/** Counts rows by the key `key` returns; keys that never occur are absent. */
export function countBy<T>(rows: readonly T[], key: (row: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const k = key(row);
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return counts;
}
