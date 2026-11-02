/**
 * Helpers for writing Mermaid sources. Authors put a glyph and an inline class on every node
 * whose status matters and never write `classDef`/`style`: the engine appends the styles.
 *
 *   E["${g('editor')} Editor de anotaciones"]${c('editor')}
 */
import { FEATURES, type FeatureId } from './features';
import { STATUS_META, type Status } from './status';

/** A status, or a tripwire item whose status is read from `FEATURES`. */
export type StatusRef = Status | FeatureId;

function isFeatureId(ref: StatusRef): ref is FeatureId {
  return Object.hasOwn(FEATURES, ref);
}

export function statusOf(ref: StatusRef): Status {
  return isFeatureId(ref) ? FEATURES[ref].status : ref;
}

/** The glyph that starts a node label: ● done, ◐ partial, ○ planned, ? undecided. */
export function g(ref: StatusRef): string {
  return STATUS_META[statusOf(ref)].glyph;
}

/** The inline Mermaid class suffix (`:::done`, ...) to put right after a node. */
export function c(ref: StatusRef): string {
  return `:::${STATUS_META[statusOf(ref)].cssClass}`;
}
