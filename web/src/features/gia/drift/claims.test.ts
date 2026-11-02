/**
 * The page promises no more than the repository records: the interface restriction is not a
 * protection, the ADRs are proposed and not accepted, and the supervision's approval is not
 * recorded. The noun "aprobación" is fine; the adjectives are not.
 */
import { describe, expect, it } from 'vitest';
import { DIAGRAMS, SECTIONS, TABLES } from '../model/registry';
import { CLAIMS_DENYLIST, contentStrings, findDenied, findRegisteredApprovals } from './checks';

describe('claims denylist over the content', () => {
  it('never says aceptado, aprobado/aprobada, protegido/protegida, seguro/segura or "solo accesible"', () => {
    const strings = contentStrings({
      sections: SECTIONS,
      diagrams: [...DIAGRAMS.values()],
      tables: [...TABLES.values()],
    });
    expect(strings.length).toBeGreaterThan(0);
    expect(findDenied(strings, CLAIMS_DENYLIST, { showMatch: true })).toEqual([]);
  });

  it('has no table cell with the approval REGISTRADA', () => {
    expect(findRegisteredApprovals([...TABLES.values()])).toEqual([]);
  });
});
