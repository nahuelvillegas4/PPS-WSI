import type { Status } from '../model/status';
import type { TileMode } from './tileProbe';

/** What the badge shows: a probe result, or "checking" while the request is in flight. */
export type BadgeState = TileMode | 'checking';

/** Fixed copy C10, one message per probe result (plus the waiting message). */
export const TILE_MODE_MESSAGES: Readonly<Record<BadgeState, string>> = {
  'dev-overlay':
    'Esta instancia usa la variante de desarrollo: las teselas se sirven sin pedir sesión. El diagrama describe el sistema con autorización real.',
  session: 'Autorización de teselas activa: sin sesión, el pedido recibe 401.',
  unknown: 'No se pudo determinar el modo de teselas.',
  checking: 'Comprobando el modo de teselas…',
};

/** The status look each state borrows, so the badge also carries a glyph and an outline. */
export const BADGE_STATUS: Readonly<Record<BadgeState, Status>> = {
  'dev-overlay': 'partial',
  session: 'done',
  unknown: 'unknown',
  checking: 'planned',
};
