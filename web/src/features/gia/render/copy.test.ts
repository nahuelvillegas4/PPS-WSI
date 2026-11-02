import { describe, expect, it } from 'vitest';
import { SNAPSHOT } from '../model/status';
import { ACCESS_NOTICE, FOOTER_LINK_TEXT, footerLead, snapshotBadge, staleMessage } from './copy';

describe('fixed copy of the shell', () => {
  it('writes C2 verbatim', () => {
    expect(ACCESS_NOTICE).toBe(
      'Visible solo para una sesión con rol administrador global. El contenido no es secreto y la restricción es de la interfaz, no del servidor.',
    );
  });

  it('builds C11 verbatim from the snapshot, with the link text at the end', () => {
    expect(footerLead(SNAPSHOT) + FOOTER_LINK_TEXT).toBe(
      'Datos al 02/11/2026 · commit 2584cfc · confeccionado a mano; ver Fuentes y método',
    );
  });

  it('follows the snapshot instead of repeating its date', () => {
    expect(footerLead({ commit: 'abc1234', label: '01/12/2026' })).toContain('01/12/2026');
    expect(snapshotBadge({ commit: 'abc1234', label: '01/12/2026' })).toBe('Datos al 01/12/2026');
  });

  it('states the age and the date in the stale banner', () => {
    const message = staleMessage(SNAPSHOT, 20);
    expect(message).toContain('02/11/2026');
    expect(message).toContain('20 días');
  });

  it('does not use words that promise more than the page can back', () => {
    const copy = [
      ACCESS_NOTICE,
      footerLead(SNAPSHOT),
      FOOTER_LINK_TEXT,
      staleMessage(SNAPSHOT, 30),
    ].join(' ');
    for (const forbidden of [/aceptad/i, /aprobad[oa]/i, /protegid[oa]/i, /\bsegur[oa]\b/i]) {
      expect(copy).not.toMatch(forbidden);
    }
    expect(copy).not.toContain('solo accesible');
  });
});
