import { describe, expect, it } from 'vitest';
import { STATUS_META } from '../model/status';
import { BADGE_STATUS, TILE_MODE_MESSAGES } from './tileMessages';
import { type TileMode, interpretTileProbe } from './tileProbe';

describe('tile mode messages (copy C10)', () => {
  it('says what the development overlay means and that the diagram shows the real system', () => {
    expect(TILE_MODE_MESSAGES['dev-overlay']).toBe(
      'Esta instancia usa la variante de desarrollo: las teselas se sirven sin pedir sesión. El diagrama describe el sistema con autorización real.',
    );
  });

  it('says that real authorization answers 401 without a session', () => {
    expect(TILE_MODE_MESSAGES.session).toBe(
      'Autorización de teselas activa: sin sesión, el pedido recibe 401.',
    );
  });

  it('admits when the mode could not be determined', () => {
    expect(TILE_MODE_MESSAGES.unknown).toBe('No se pudo determinar el modo de teselas.');
  });

  it('has a message for every probe result a status can produce', () => {
    const modes: TileMode[] = [200, 401, 403, 500].map(interpretTileProbe);
    for (const mode of modes) expect(TILE_MODE_MESSAGES[mode]).not.toBe('');
  });

  it('gives each state a distinct status look, so the badge is not read by colour alone', () => {
    const glyphs = Object.values(BADGE_STATUS).map((status) => STATUS_META[status].glyph);
    expect(new Set(glyphs).size).toBe(glyphs.length);
  });
});
