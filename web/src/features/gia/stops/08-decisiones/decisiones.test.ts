/**
 * Drift tests of the decisions stop: the 17 ADR rows against the repository, the quadrant
 * counted from them, and the honesty of the scope-change content (no "approved", no "accepted",
 * the approval never REGISTRADA, C1 and O1 together and verbatim).
 */
import { describe, expect, it } from 'vitest';
import { ADR_EVIDENCE, ADRS, adrLabel, adrQuadrants, realisedOf } from '../../data/adrs';
import {
  CLAIMS_DENYLIST,
  PROPOSED_ADRS,
  collectStrings,
  findDenied,
  findRegisteredApprovals,
  hasBuiltProof,
  sectionBlocks,
} from '../../drift/checks';
import {
  allRepoPaths,
  findRepoText,
  matchRepoGlob,
  readRepoFile,
  repoPathExists,
} from '../../drift/repoFiles.testing';
import { formatIssues } from '../../engine/diagramLint';
import { FACTS } from '../../model/facts';
import { FEATURES, type FeatureId } from '../../model/features';
import type { Block, Cell, TableDef } from '../../model/types';
import { cambioAlcance } from './diagrams';
import { content } from './index';
import { adrsTable, tresEjesTable } from './tables';

// The fixed copy, written out again on purpose: an edit of copy.ts must fail here (design 2).
const C1 =
  'El ADR-15 (§Plazo y §Verificación) dice que la migración y la pantalla de usuarios no se integran sin aprobación escrita. El código ya está en main desde el 01/11/2026, integrado por decisión de los estudiantes para la demostración del 02/11, sin PR y antes de recibir esa aprobación. El ADR sigue PROPUESTO.';
const C1_FOOTNOTE =
  'El texto del ADR-15 menciona la rama feat/roles-por-proyecto-y-subida: se fusionó por avance rápido en main y se borró.';
const O1 =
  'Origen: el ADR-15 registra que el pedido de roles por proyecto fue del profesor el 31/10/2026, y la subida desde el navegador se incorporó tras la muestra con la supervisión del 27/10. Lo que no consta en el repositorio es la aprobación escrita ni la contrapartida de esfuerzo.';
const C7 =
  'Reparto del editor: opción A propuesta, sin aprobación de la supervisión; interfaz sin construir';
const C8 = 'desactualizado: pendiente de actualizar cuando la supervisión apruebe (ADR-15:108-115)';

interface IndexRow {
  n: number;
  title: string;
  state: string;
}

/** Rows of the table of `docs/adr/README.md`: number, title and the whole state cell. */
function parseIndexRows(markdown: string): IndexRow[] {
  const rows: IndexRow[] = [];
  for (const line of markdown.split('\n')) {
    const cells = line.split('|').map((cell) => cell.trim());
    const id = /^\[ADR-(\d+)\]\(/.exec(cells[1] ?? '');
    if (!id || cells[2] === undefined || cells[3] === undefined) continue;
    rows.push({ n: Number(id[1]), title: cells[2], state: cells[3] });
  }
  return rows;
}

/**
 * The page writes `autorizadas` where the index says `protegidas`: the page never uses the word
 * "protegida" (design 9), because the interface restriction and the tile authorisation are not a
 * protection of the content. Backticks are markup and are not shown.
 */
function asShownByThePage(indexTitle: string): string {
  return indexTitle.replace(/`/g, '').replace(/protegidas/g, 'autorizadas');
}

function blocksOf(): Block[] {
  return sectionBlocks(content.section);
}

function callouts(): Extract<Block, { kind: 'callout' }>[] {
  return blocksOf().filter(
    (block): block is Extract<Block, { kind: 'callout' }> => block.kind === 'callout',
  );
}

function describeBlock(block: Block): string {
  return 'id' in block ? `${block.kind}:${block.id}` : block.kind;
}

function cellsOf(table: TableDef, key: string): Cell[] {
  return table.rows.flatMap((row) => (row[key] === undefined ? [] : [row[key]]));
}

describe('ADR rows against docs/adr/README.md', () => {
  it('lists the 17 ADRs, in order, with the title and the state of the index', async () => {
    const index = parseIndexRows(await readRepoFile('docs/adr/README.md'));
    expect(index.map((row) => row.n)).toEqual(ADRS.map((row) => row.n));
    expect(ADRS.map((row) => row.n)).toEqual(Array.from({ length: 17 }, (_, i) => i + 1));
    for (const row of ADRS) {
      const indexed = index.find((candidate) => candidate.n === row.n);
      expect(indexed, adrLabel(row.n)).toBeDefined();
      expect(row.title, `${adrLabel(row.n)} title`).toBe(asShownByThePage(indexed?.title ?? ''));
      expect(indexed?.state.startsWith(`\`${row.decision}\``), `${adrLabel(row.n)} state`).toBe(
        true,
      );
    }
  });

  it('only rewords the one title that contains the word "protegidas"', async () => {
    const index = parseIndexRows(await readRepoFile('docs/adr/README.md'));
    const reworded = index.filter(
      (row) => asShownByThePage(row.title) !== row.title.replace(/`/g, ''),
    );
    expect(reworded.map((row) => row.n)).toEqual([4]);
  });

  it('has 10 DECIDIDO and 7 PROPUESTO, the PROPUESTO being exactly 07, 08, 09, 10, 15, 16 and 17', () => {
    const proposed = ADRS.filter((row) => row.decision === 'PROPUESTO').map((row) => row.n);
    expect(proposed).toEqual([7, 8, 9, 10, 15, 16, 17]);
    expect(proposed).toEqual([...PROPOSED_ADRS]);
    expect(ADRS.filter((row) => row.decision === 'DECIDIDO')).toHaveLength(10);
  });

  it('never names a state Aprobado or Aceptado: the decision is DECIDIDO or PROPUESTO', () => {
    expect(new Set(ADRS.map((row) => row.decision))).toEqual(new Set(['DECIDIDO', 'PROPUESTO']));
  });

  it('matches the ADR files: one per row, with the first state of the file and a qualifier when it has more', async () => {
    const files = allRepoPaths().filter((path) => /^docs\/adr\/\d{4}-[^/]+\.md$/.test(path));
    expect(files).toHaveLength(FACTS.adrs);
    expect(ADRS).toHaveLength(FACTS.adrs);
    for (const row of ADRS) {
      const file = files.find((path) =>
        path.startsWith(`docs/adr/${String(row.n).padStart(4, '0')}-`),
      );
      expect(file, adrLabel(row.n)).toBeDefined();
      const text = await readRepoFile(file ?? '');
      const line = text.split('\n').find((candidate) => candidate.startsWith('**Estado:**')) ?? '';
      const states = [
        ...line.slice(0, line.indexOf('**Fecha:**')).matchAll(/`(DECIDIDO|PROPUESTO|PENDIENTE)`/g),
      ].map((match) => match[1]);
      expect(states[0], `${adrLabel(row.n)} first state`).toBe(row.decision);
      expect(row.qualifier !== undefined, `${adrLabel(row.n)} qualifier`).toBe(states.length > 1);
    }
  });
});

describe('what is in code', () => {
  it('has partial rows say what is pending, and a verdict for every ADR', () => {
    for (const row of ADRS) {
      if (row.inCode === 'partial')
        expect((row.pending ?? '').trim(), adrLabel(row.n)).not.toBe('');
      expect(['done', 'partial']).toContain(row.inCode);
    }
  });

  it('backs every ADR with at least one file that exists', () => {
    for (const row of ADRS) {
      expect(
        ADR_EVIDENCE.some((evidence) => evidence.adr === row.n),
        adrLabel(row.n),
      ).toBe(true);
    }
    for (const evidence of ADR_EVIDENCE) {
      expect(repoPathExists(evidence.ref), `${adrLabel(evidence.adr)} ${evidence.ref}`).toBe(true);
    }
  });

  // The partial verdicts that nothing else watches: when the missing piece appears, the test
  // names the ADR row to update.
  it('still lacks what the partial ADR-15 and ADR-17 say is pending', async () => {
    expect(
      await findRepoText({ in: ['api/src/**'], pattern: 'protected-user' }),
      'ADR-15 protected-user',
    ).toEqual([]);
    expect(
      await findRepoText({ in: ['api/src/**'], pattern: 'UploadPreflight' }),
      'ADR-17 preflight',
    ).toEqual([]);
    const storage = await readRepoFile(
      'api/src/Pps.Infrastructure/Storage/PhysicalStorageService.cs',
    );
    expect(storage, 'ADR-17 still overwrites').toContain('FileMode.Create');
  });

  it('still lacks the lock of NuGet that ADR-14 says is pending', () => {
    expect(matchRepoGlob('**/packages.lock.json'), 'ADR-14').toEqual([]);
  });

  it('keeps the tripwire items behind the other partial ADRs as not built', () => {
    const behind: Record<number, FeatureId[]> = {
      5: ['ci'],
      8: ['editor'],
      10: ['yolo'],
      11: ['composeServer', 'smoke', 'backup', 'fetchSamples'],
      13: ['codeowners', 'ci'],
      16: ['sessionValidator', 'csrfGuard', 'httpTests'],
    };
    for (const [n, features] of Object.entries(behind)) {
      const row = ADRS.find((candidate) => candidate.n === Number(n));
      expect(row?.inCode, adrLabel(Number(n))).toBe('partial');
      for (const feature of features) {
        expect(
          FEATURES[feature].status,
          `${FEATURES[feature].label} figura como construido: revisá ${adrLabel(Number(n))} en data/adrs.ts`,
        ).not.toBe('done');
      }
    }
  });
});

describe('quadrant', () => {
  it('counts 5 / 5 / 2 / 5 from the rows', () => {
    const cells = adrQuadrants(ADRS);
    expect(cells.map((cell) => [cell.decision, cell.realised, cell.items.length])).toEqual([
      ['DECIDIDO', 'realizado', 5],
      ['DECIDIDO', 'parcial', 5],
      ['PROPUESTO', 'realizado', 2],
      ['PROPUESTO', 'parcial', 5],
    ]);
    expect(cells.flatMap((cell) => cell.items).sort()).toEqual(
      ADRS.map((row) => adrLabel(row.n)).sort(),
    );
  });

  it('puts each ADR in the cell of its decision and its verdict in code', () => {
    const cells = adrQuadrants(ADRS);
    expect(cells[0]?.items).toEqual(['ADR-01', 'ADR-02', 'ADR-03', 'ADR-04', 'ADR-06']);
    expect(cells[2]?.items).toEqual(['ADR-07', 'ADR-09']);
    const adr7 = ADRS.find((row) => row.n === 7);
    expect(adr7 === undefined ? undefined : realisedOf(adr7)).toBe('realizado');
  });

  it('is the block the stop shows, and its notes read the same counts', () => {
    const quadrants = blocksOf().find((block) => block.kind === 'quadrants');
    expect(quadrants).toEqual({ kind: 'quadrants', cells: adrQuadrants(ADRS) });
    expect(content.section.notes[1]).toContain('5 decisiones tomadas y realizadas');
    expect(content.section.notes[1]).toContain('2 propuestas que ya están en el código');
  });
});

describe('the adrs table', () => {
  const table = adrsTable();

  it('has one row per ADR, with the decision of the index and the verdict in code', () => {
    expect(table.id).toBe('adrs');
    expect(table.rows).toHaveLength(FACTS.adrs);
    ADRS.forEach((row, i) => {
      expect(table.rows[i]?.adr).toBe(adrLabel(row.n));
      expect(table.rows[i]?.decision).toEqual({ decision: row.decision });
      expect(table.rows[i]?.inCode).toEqual({ status: row.inCode });
    });
    expect(table.columns.map((column) => column.label)).toEqual([
      'ADR',
      'Título',
      'Decisión',
      'En código',
      'Una frase',
      'Pendiente',
    ]);
  });

  it('cites code or a test or config as proof of what it shows built, and only existing files', () => {
    expect(hasBuiltProof(table.sources)).toBe(true);
    for (const source of table.sources.filter((evidence) => evidence.kind !== 'git')) {
      expect(repoPathExists(source.ref.replace(/:\d+(?:-\d+)?$/, '')), source.ref).toBe(true);
    }
  });

  it('shows the qualifier next to the title only where the state line has one', () => {
    const withQualifier = ADRS.filter((row) => row.qualifier !== undefined).map((row) => row.n);
    expect(withQualifier).toEqual([4, 6, 11, 12]);
    expect(table.rows[5]?.title).toContain('los límites numéricos siguen PROPUESTO');
  });
});

describe('the scope change', () => {
  it('uses C1 verbatim as an honest callout, and O1 as the paragraph right under it', () => {
    const blocks = content.section.tabs.find((tab) => tab.id === 'cambio-de-alcance')?.blocks ?? [];
    const at = blocks.findIndex(
      (block) => block.kind === 'callout' && block.tone === 'honest' && block.text === C1,
    );
    expect(at).toBeGreaterThan(-1);
    const next = blocks[at + 1];
    expect(next).toMatchObject({ kind: 'callout', tone: 'info', text: O1 });
    expect(callouts().filter((callout) => callout.tone === 'honest')).toHaveLength(1);
  });

  it('carries the footnote of C1', () => {
    expect(content.section.footnotes).toEqual([{ id: 'c1-rama', text: C1_FOOTNOTE }]);
  });

  it('shows the diagram, the three axes and the collapsed added scope, in that order', () => {
    const blocks = content.section.tabs.find((tab) => tab.id === 'cambio-de-alcance')?.blocks ?? [];
    expect(blocks.map(describeBlock)).toEqual([
      'diagram:cambio-alcance',
      'table:tres-ejes',
      'callout',
      'callout',
      'table:alcance-agregado',
    ]);
    expect(content.tables.find((table) => table.id === 'alcance-agregado')?.collapsible).toBe(true);
  });

  it('keeps code, decision and approval apart in the three-axis row, and never REGISTRADA', () => {
    const table = tresEjesTable();
    const [first, editor, contract, docs] = table.rows;
    expect(first?.code).toEqual({
      status: 'partial',
      text: 'IMPLEMENTADO PARCIALMENTE en main (01/11/2026, commits 7a11164..2584cfc)',
    });
    expect(first?.decision).toEqual({ decision: 'PROPUESTO' });
    expect(first?.approval).toEqual({ approval: 'NO_REGISTRADA' });
    expect(first?.effort).toEqual({ approval: 'PENDIENTE' });
    expect(editor?.feature).toContain(C7);
    expect(docs?.feature).toContain(C8);
    expect(contract?.decision).toEqual({ decision: 'PROPUESTO' });
    expect(
      cellsOf(table, 'approval').every(
        (cell) =>
          typeof cell === 'object' && 'approval' in cell && cell.approval === 'NO_REGISTRADA',
      ),
    ).toBe(true);
    expect(findRegisteredApprovals(content.tables)).toEqual([]);
  });

  it('shows the four scope-change rows of the added scope as NO_REGISTRADA', () => {
    const table = content.tables.find((candidate) => candidate.id === 'alcance-agregado');
    const approvals = table ? cellsOf(table, 'approval').slice(0, 4) : [];
    expect(approvals).toEqual(Array.from({ length: 4 }, () => ({ approval: 'NO_REGISTRADA' })));
  });

  it('draws the state diagram with the last two states planned and none called approved', () => {
    expect(cambioAlcance.id).toBe('cambio-alcance');
    expect(cambioAlcance.kind).toBe('state');
    expect(cambioAlcance.source).toContain('Aprobación escrita<br/>PENDIENTE');
    expect(cambioAlcance.source).toContain('Contrato 1.0.0<br/>PENDIENTE');
    expect(cambioAlcance.source).toContain('EnMain --> Aprobacion:::planned');
    expect(cambioAlcance.source).toContain('Aprobacion --> Contrato:::planned');
    expect(cambioAlcance.source).not.toMatch(/aprobad[oa]/i);
    expect(hasBuiltProof(cambioAlcance.sources)).toBe(true);
  });

  it('passes the static lint of the diagram engine', () => {
    expect(formatIssues(cambioAlcance)).toEqual([]);
  });
});

describe('the words of the whole stop', () => {
  it('never says aceptado, aprobado/aprobada, protegido/protegida, seguro/segura or "solo accesible"', () => {
    const strings = collectStrings(content, 'stop');
    expect(strings.length).toBeGreaterThan(50);
    expect(findDenied(strings, CLAIMS_DENYLIST, { showMatch: true })).toEqual([]);
  });

  it('keeps the headline within 90 characters and reads the ADR total from FACTS', () => {
    expect(content.section.headline.length).toBeLessThanOrEqual(90);
    expect(content.section.headline.startsWith(`${FACTS.adrs} decisiones`)).toBe(true);
    expect(content.section.group).toBe('recorrido');
    expect(content.section.minutes).toBe(2);
  });
});
