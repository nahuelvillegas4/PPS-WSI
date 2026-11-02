// Tests of annexes A6 (glosario) and A7 (fuentes). They live next to the last stop because the
// edit surface of the unit that writes the annexes is this folder, the final stop and the sketches.
import { describe, expect, it } from 'vitest';
import { content as a6 } from '../../anexos/a6-glosario';
import { GLOSSARY } from '../../anexos/a6-glosario';
import { ACCESS_CLAIM, FOOTER_TEXT, PUBLIC_CONTENT, content as a7 } from '../../anexos/a7-fuentes';
import { FACTS } from '../../model/facts';
import { FEATURES } from '../../model/features';
import { SNAPSHOT, STATUS_META } from '../../model/status';
import type { Cell, StopContent, TableDef } from '../../model/types';
import {
  CLAIM_PATTERNS,
  LEAK_PATTERNS,
  collectStrings,
  evidenceProblems,
  matchesOf,
} from '../10-final/unitChecks.testing';

function onlyTable(content: StopContent, id: string): TableDef {
  const found = content.tables.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Table not defined: ${id}`);
  return found;
}

/** The text of a cell that holds a term: a plain string or a monospace one. */
function cellText(cell: Cell | undefined): string {
  if (typeof cell === 'string') return cell;
  if (typeof cell === 'object' && 'mono' in cell) return cell.mono;
  throw new Error('Not a text cell');
}

/** Lower case without accents, so "Membresía" and "membresia" count as the same term. */
function normalise(term: string): string {
  return term
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

describe('annex A6 (glosario)', () => {
  const glossary = onlyTable(a6, 'glosario');

  it('is an annex with a headline, 2 to 4 speaker notes and one table, referenced once', () => {
    expect(a6.section.id).toBe('a6-glosario');
    expect(a6.section.group).toBe('anexo');
    expect(a6.section.headline.length).toBeLessThanOrEqual(90);
    expect(a6.section.notes.length).toBeGreaterThanOrEqual(2);
    expect(a6.section.notes.length).toBeLessThanOrEqual(4);
    const referenced = a6.section.tabs.flatMap((tab) => tab.blocks);
    expect(referenced).toEqual([{ kind: 'table', id: 'glosario' }]);
    expect(a6.diagrams).toHaveLength(0);
  });

  it('has no duplicate term, ignoring case and accents', () => {
    const terms = glossary.rows.map((row) => normalise(cellText(row.termino)));
    expect(terms.length).toBeGreaterThan(0);
    expect(new Set(terms).size).toBe(terms.length);
  });

  it('defines the terms the page leans on', () => {
    const terms = new Set(glossary.rows.map((row) => cellText(row.termino)));
    const required = [
      'WSI',
      'DZI',
      'ADR',
      'PPS',
      'CRIC',
      'CCEDD',
      'COCO',
      'ETag',
      'auth_request',
      'nivel 0',
      'membresía',
      'dryRun',
    ];
    for (const term of required) expect(terms.has(term), term).toBe(true);
  });

  it('gives each term one non-empty line, and is built from the glossary list', () => {
    expect(glossary.rows).toHaveLength(GLOSSARY.length);
    for (const row of glossary.rows) {
      const line = cellText(row.linea);
      expect(line.trim().length).toBeGreaterThan(10);
      expect(line).not.toContain('\n');
    }
  });

  it('shows identifiers in monospace and words as plain text', () => {
    const cells = Object.fromEntries(
      glossary.rows.map((row) => [cellText(row.termino), row.termino]),
    );
    expect(cells.auth_request).toEqual({ mono: 'auth_request' });
    expect(cells.dryRun).toEqual({ mono: 'dryRun' });
    expect(cells.WSI).toBe('WSI');
  });

  // Audit C8: DECIDIDO and PROPUESTO are used on the page, so the glossary defines them.
  it('defines DECIDIDO and PROPUESTO as the architecture README does', () => {
    const byTerm = Object.fromEntries(GLOSSARY.map((entry) => [entry.term, entry.meaning]));
    expect(byTerm.DECIDIDO).toContain('lo acordaron los dos estudiantes entre sí');
    expect(byTerm.DECIDIDO).toContain('No es una aprobación de la supervisión');
    expect(byTerm.PROPUESTO).toContain('necesita validación de la supervisión');
    expect(byTerm.ADR).toContain('DECIDIDO o PROPUESTO');
  });

  it('reads its numbers from FACTS and the status of planned items from FEATURES', () => {
    const byTerm = Object.fromEntries(GLOSSARY.map((entry) => [entry.term, entry.meaning]));
    expect(byTerm.ADR).toContain(String(FACTS.adrs));
    expect(byTerm.contrato).toContain(`${FACTS.operations} operaciones`);
    expect(byTerm.contrato).toContain(`${FACTS.tileOperations} de teselas`);
    expect(byTerm.YOLO).toContain(STATUS_META[FEATURES.yolo.status].label.toLowerCase());
    expect(byTerm.TLS).toContain(STATUS_META[FEATURES.tls.status].label.toLowerCase());
    expect(byTerm.CSRF).toContain(STATUS_META[FEATURES.csrfGuard.status].label.toLowerCase());
  });

  it('cites files that exist and never claims approval, acceptance or protection', async () => {
    expect(await evidenceProblems(glossary.sources)).toEqual([]);
    expect(matchesOf(a6, CLAIM_PATTERNS)).toEqual([]);
    expect(matchesOf(a6, LEAK_PATTERNS)).toEqual([]);
  });
});

describe('annex A7 (fuentes)', () => {
  const sources = onlyTable(a7, 'fuentes');

  it('is an annex with a headline, 2 to 4 speaker notes and a table, referenced once', () => {
    expect(a7.section.id).toBe('a7-fuentes');
    expect(a7.section.group).toBe('anexo');
    expect(a7.section.headline.length).toBeLessThanOrEqual(90);
    expect(a7.section.notes.length).toBeGreaterThanOrEqual(2);
    expect(a7.section.notes.length).toBeLessThanOrEqual(4);
    const tables = a7.section.tabs.flatMap((tab) =>
      tab.blocks.flatMap((block) => (block.kind === 'table' ? [block.id] : [])),
    );
    expect(tables).toEqual(['fuentes']);
    expect(a7.diagrams).toHaveLength(0);
  });

  it('says what the page is and what its restriction is not, in the agreed words', () => {
    expect(ACCESS_CLAIM).toBe(
      'Visible solo para una sesión con rol administrador global. El contenido no es secreto y la restricción es de la interfaz, no del servidor.',
    );
    const callouts = a7.section.tabs.flatMap((tab) =>
      tab.blocks.flatMap((block) => (block.kind === 'callout' ? [block.text] : [])),
    );
    expect(callouts).toContain(ACCESS_CLAIM);
  });

  // Audit C7: the content is public for whoever reaches the gateway and includes the debt list.
  it('says that the content is public and includes the list of security debt', () => {
    expect(PUBLIC_CONTENT).toContain('es público para quien alcance la pasarela');
    expect(PUBLIC_CONTENT).toContain('incluye la lista de deuda de seguridad');
    expect(PUBLIC_CONTENT).toContain('no valores ni credenciales');
    const callouts = a7.section.tabs.flatMap((tab) =>
      tab.blocks.flatMap((block) => (block.kind === 'callout' ? [block] : [])),
    );
    expect(callouts.find((callout) => callout.text === PUBLIC_CONTENT)?.tone).toBe('honest');
  });

  it('quotes the footer of the page with the date and commit of the snapshot', () => {
    expect(FOOTER_TEXT).toBe(
      'Datos al 02/11/2026 · commit 2584cfc · confeccionado a mano; ver Fuentes y método',
    );
    expect(FOOTER_TEXT).toContain(SNAPSHOT.label);
    expect(FOOTER_TEXT).toContain(SNAPSHOT.commit);
    const items = a7.section.tabs.flatMap((tab) =>
      tab.blocks.flatMap((block) => (block.kind === 'list' ? block.items : [])),
    );
    expect(items.some((item) => item.includes(FOOTER_TEXT))).toBe(true);
  });

  it('states that test results are the record of an execution, not a derived fact', () => {
    const row = sources.rows.find((candidate) =>
      cellText(candidate.dato).startsWith('Resultados de las pruebas'),
    );
    expect(row).toBeDefined();
    expect(cellText(row?.verificado)).toContain('registro de una ejecución');
    expect(cellText(row?.verificado)).toContain('no un dato derivado');
    const callout = a7.section.tabs.flatMap((tab) =>
      tab.blocks.flatMap((block) => (block.kind === 'callout' ? [block.text] : [])),
    );
    expect(callout.some((text) => text.includes('registro de una ejecución'))).toBe(true);
  });

  it('has, for every family of facts, how it was verified and what was not', () => {
    expect(sources.columns.map((column) => column.label)).toEqual([
      'Dato',
      'Cómo se verificó',
      'Qué no se verificó',
    ]);
    expect(sources.rows.length).toBeGreaterThanOrEqual(10);
    const facts = sources.rows.map((row) => cellText(row.dato));
    expect(new Set(facts).size).toBe(facts.length);
    for (const row of sources.rows) {
      expect(cellText(row.verificado).length).toBeGreaterThan(20);
      expect(cellText(row.pendiente).length).toBeGreaterThan(20);
    }
  });

  it('reads the pinned numbers it quotes from FACTS', () => {
    const text = sources.rows.map((row) => cellText(row.dato)).join('\n');
    for (const value of [FACTS.operations, FACTS.tileOperations, FACTS.tables, FACTS.migrations]) {
      expect(text).toContain(String(value));
    }
    expect(text).toContain(`${FACTS.requirements}`);
    expect(text).toContain(`${FACTS.adrs} ADR`);
  });

  it('cites files that exist and never claims approval, acceptance or protection', async () => {
    expect(await evidenceProblems(sources.sources)).toEqual([]);
    expect(matchesOf(a7, CLAIM_PATTERNS)).toEqual([]);
    expect(matchesOf(a7, LEAK_PATTERNS)).toEqual([]);
  });

  it('never names a person, hours or per-author figures', () => {
    expect(matchesOf(a7, [/\bhoras?\b/i, /por autor/i])).toEqual([]);
  });

  // Audit C10: git and the logbook date the same days differently, and the page says so. The
  // logbook is still individual evaluation data, so A7 may name it only to speak of dates.
  it('names the logbook only to say that its dates differ from the dates of git', () => {
    const mentions = collectStrings(a7).filter((text) => /bitácora/i.test(text));
    expect(mentions).toHaveLength(1);
    expect(mentions[0]).toContain('entre 0 y 5 días después que git');
    expect(mentions[0]).toMatch(/fecha/);
  });
});
