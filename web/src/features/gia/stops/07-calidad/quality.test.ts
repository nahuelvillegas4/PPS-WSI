import { describe, expect, it } from 'vitest';
import { content as a3 } from '../../anexos/a3-calidad';
import { MEASURED } from '../../data/measured';
import {
  findRepoText,
  matchRepoGlob,
  readRepoFile,
  repoPathExists,
} from '../../drift/repoFiles.testing';
import { FACTS } from '../../model/facts';
import { FEATURES } from '../../model/features';
import type { Block } from '../../model/types';
import { chipTextOf, statusOfCell, textOf } from './cells.testing';
import { contratoVerificacion } from './diagrams';
import { content } from './index';
import { riesgosTable } from './risks';
import { pruebasTable, qsTable } from './tables';

function blocksOf(blocks: readonly { blocks: readonly Block[] }[]): Block[] {
  return blocks.flatMap((tab) => tab.blocks);
}

describe('stop 7: structure', () => {
  const { section } = content;

  it('has the three tabs of the design and the headline of the walk-through', () => {
    expect(section.id).toBe('calidad');
    expect(section.headline).toBe('Qué se probó, cómo y qué no cubren las pruebas.');
    expect(section.tabs.map((tab) => tab.id)).toEqual(['pruebas', 'contrato', 'escenarios']);
  });

  it('owns the diagram and the tables it shows, and defines qs once', () => {
    expect(content.diagrams.map((diagram) => diagram.id)).toEqual(['contrato-verificacion']);
    expect(content.tables.map((table) => table.id)).toEqual(['pruebas', 'qs']);
    const shown = blocksOf(section.tabs);
    expect(shown).toContainEqual({ kind: 'diagram', id: 'contrato-verificacion' });
    expect(shown).toContainEqual({ kind: 'table', id: 'pruebas' });
    expect(shown).toContainEqual({ kind: 'table', id: 'qs' });
  });

  it('puts copy C4 in the first tab next to the three suite figures', () => {
    const first = section.tabs[0]?.blocks ?? [];
    const stats = first.find((item) => item.kind === 'stats');
    expect(stats?.kind === 'stats' ? stats.items.map((item) => item.value) : []).toEqual([
      '292',
      '284',
      '24',
    ]);
    const callout = first.find((item) => item.kind === 'callout');
    expect(callout?.kind === 'callout' ? callout.text : '').toMatch(
      /^Cada suite, con su fecha: API 292 casos \(152 métodos; corrida del 01\/11 en contenedor;/,
    );
  });

  it('never shows 292 without saying it counts cases of 152 methods', () => {
    const stats = (section.tabs[0]?.blocks ?? []).find((item) => item.kind === 'stats');
    const api = stats?.kind === 'stats' ? stats.items[0] : undefined;
    expect(api?.label).toContain('152 métodos');
    const text = JSON.stringify(content);
    expect(text).not.toMatch(/292 tests/i);
  });

  it('lists what the tests do not cover, with the tripwire sentences for HTTP and CI', () => {
    const cards = (section.tabs[0]?.blocks ?? []).find((item) => item.kind === 'cards');
    const items = cards?.kind === 'cards' ? cards.items : [];
    expect(items).toHaveLength(5);
    expect(items.map((item) => item.title)).toEqual([
      'Sin capa HTTP',
      'Sin PostgreSQL real',
      'Sin pruebas de interfaz',
      'Sin un SVS real',
      'Sin integración continua',
    ]);
    expect(items[0]?.body).toBe(FEATURES.httpTests.gap);
    expect(items[4]?.body).toBe(FEATURES.ci.gap);
    expect(FEATURES.httpTests.status).not.toBe('done');
    expect(FEATURES.ci.status).not.toBe('done');
  });

  it('has 2 to 4 speaker notes whose first line is the talking point', () => {
    expect(section.notes.length).toBeGreaterThanOrEqual(2);
    expect(section.notes.length).toBeLessThanOrEqual(4);
    expect(section.notes[0]).toBe('Cada número lleva fecha, método y límites.');
  });
});

describe('table pruebas', () => {
  it('has the four suites of the design and the 01/11 checks, labelled as assisted and local', () => {
    expect(pruebasTable.rows.map((row) => row.suite)).toEqual([
      'API (xUnit)',
      'Web (Vitest)',
      'Teselas (pytest)',
      'Contrato (check_contract.py)',
      'Verificaciones asistidas del 01/11',
    ]);
    const assisted = pruebasTable.rows[4];
    expect(assisted?.limit).toBe('Registro local del 01/11, no reproducible desde el repositorio');
    // The record says the 8 browser steps were run with an agent; the table must not say "manual".
    expect(assisted?.cases).toContain('(estos, con un agente)');
    expect(JSON.stringify(pruebasTable)).not.toMatch(/manual(es)? del equipo/i);
  });

  it('gives each suite its own run: the API on 01/11, the web on the snapshot, tiles on 17/10', () => {
    const [api, web, tiles] = pruebasTable.rows;
    expect(api?.ran).toBe(
      'Corrida del 01/11/2026 en contenedor · el código de la API no cambió desde 871f574',
    );
    expect(web?.ran).toBe('02/11/2026 · copia exportada de 2584cfc, sin las pruebas de esta guía');
    expect(tiles?.ran).toBe(
      'Última corrida registrada: 17/10/2026 · dc5f93c; el código no cambió desde entonces',
    );
    expect(JSON.stringify(pruebasTable)).not.toMatch(/HEAD/);
  });

  it('counts the blocks of the contract checker and says which ones can be skipped', async () => {
    const contract = pruebasTable.rows[3];
    expect(contract?.cases).toBe(
      '7 bloques (2 se omiten si faltan openslide-python u openapi-spec-validator)',
    );
    const script = await readRepoFile('scripts/check_contract.py');
    expect(script).toContain('openslide-python no está instalado');
    expect(script).toContain('openapi-spec-validator no está instalado');
    expect(script).toContain('Este bloque es obligatorio');
  }, 30_000);

  it('takes its figures from MEASURED', () => {
    const [api, web, tiles] = pruebasTable.rows;
    expect(api?.cases).toBe(
      `${String(MEASURED.apiTestCases.value)} casos de ${String(MEASURED.apiTestMethods.value)} métodos`,
    );
    expect(web?.cases).toBe(
      `${String(MEASURED.webTestCases.value)} de ${String(MEASURED.webTestCases.value)} casos en ${String(MEASURED.webTestFiles.value)} archivos`,
    );
    expect(tiles?.cases).toBe(
      `${String(MEASURED.tilesTestFunctions.value)} de ${String(MEASURED.tilesTestFunctions.value)} casos`,
    );
  });
});

describe('table qs', () => {
  it('has QS-1 to QS-10 in order, each with a goal and evidence', () => {
    expect(qsTable.rows.map((row) => row.qs)).toEqual(
      Array.from({ length: 10 }, (_, index) => `QS-${String(index + 1)}`),
    );
    for (const row of qsTable.rows) {
      expect(textOf(row.goal).trim(), textOf(row.qs)).not.toBe('');
      expect(textOf(row.evidence).trim(), textOf(row.qs)).not.toBe('');
    }
  });

  it('shows no scenario as fully met and takes the editor-dependent ones from FEATURES', () => {
    const states = Object.fromEntries(
      qsTable.rows.map((row) => [textOf(row.qs), statusOfCell(row.state)]),
    );
    expect(Object.values(states)).not.toContain('done');
    expect(states['QS-2']).toBe(FEATURES.editor.status);
    expect(states['QS-5']).toBe(FEATURES.smoke.status);
    expect(states['QS-10']).toBe('partial');
  });

  it('words QS-1 and QS-2 as the architecture document does: pixels of the screen, byte for byte', async () => {
    const goal = (id: string) => textOf(qsTable.rows.find((row) => textOf(row.qs) === id)?.goal);
    expect(goal('QS-1')).toContain('ida y vuelta ≤ 0,5 px de pantalla');
    expect(goal('QS-2')).toContain('JSON guardado idéntico byte a byte');
    expect(goal('QS-2')).toContain('desplazamiento visual ≤ 1 px de pantalla');
    const doc = await readRepoFile('docs/arquitectura/05-calidad-y-riesgos.md');
    expect(doc).toContain('ida y vuelta ≤ 0,5 px de pantalla');
    expect(doc).toContain(
      'JSON guardado idéntico byte a byte; desplazamiento visual ≤ 1 px de pantalla',
    );
  }, 30_000);

  it('shows QS-10 as partial because only the web and the tiles document their test command', async () => {
    const qs10 = textOf(qsTable.rows.find((row) => textOf(row.qs) === 'QS-10')?.evidence);
    expect(qs10).toContain('api/README.md no documenta el de la API');
    expect(await readRepoFile('web/README.md')).toContain('npm test');
    expect(await readRepoFile('tiles/README.md')).toContain('pytest');
    expect(await readRepoFile('api/README.md')).not.toMatch(/dotnet test/);
  }, 30_000);

  it('quotes the performance figures from MEASURED, with the date, and says they must be repeated', () => {
    const qs4 = textOf(qsTable.rows[3]?.evidence);
    expect(qs4).toContain('110,9 ms');
    expect(qs4).toContain('11,62 ms');
    expect(qs4).toContain('28/10/2026');
    expect(qs4).toContain('falta volver a medir');
  });

  it('is shown here and in annex A3, which does not define it again', () => {
    const inA3 = blocksOf(a3.section.tabs).filter((item) => item.kind === 'table');
    expect(inA3).toContainEqual({ kind: 'table', id: 'qs' });
    expect(a3.tables.map((table) => table.id)).toEqual(['riesgos']);
  });
});

describe('risk R13', () => {
  it('says no decision is recorded about the server, not that the supervision did not answer', () => {
    const r13 = riesgosTable.rows.find((row) => textOf(row.r) === 'R13');
    expect(chipTextOf(r13?.state)).toBe('Sin decisión registrada sobre el acceso al servidor (S2)');
    expect(JSON.stringify(riesgosTable)).not.toMatch(/sin respuesta|no respondi/i);
  });
});

describe('table riesgos', () => {
  it('has R1 to R15 in order with a probability and an impact', () => {
    expect(riesgosTable.rows.map((row) => row.r)).toEqual(
      Array.from({ length: 15 }, (_, index) => `R${String(index + 1)}`),
    );
    for (const row of riesgosTable.rows) expect(textOf(row.pi), textOf(row.r)).toMatch(/ \/ /);
  });

  it('reads the editor and responsibility-file risks from FEATURES', () => {
    const byId = new Map(riesgosTable.rows.map((row) => [textOf(row.r), statusOfCell(row.state)]));
    expect(byId.get('R2')).toBe(FEATURES.editor.status);
    expect(byId.get('R14')).toBe(FEATURES.codeowners.status);
  });

  it('says what the indicator means', () => {
    expect(riesgosTable.caption).toContain('estado de la mitigación');
  });
});

describe('diagram G16', () => {
  it('is a flowchart that uses the status classes and reads the counts from FACTS', () => {
    expect(contratoVerificacion.kind).toBe('flowchart');
    expect(contratoVerificacion.usesStatus).toBe(true);
    expect(contratoVerificacion.source).toContain(`API: ${String(FACTS.operations)}`);
    expect(contratoVerificacion.source).toContain(`teselas: ${String(FACTS.tileOperations)}`);
    expect(contratoVerificacion.source).toContain(`(${String(FACTS.operations)} filas)`);
  });

  it('draws the planned pieces dashed and the continuous integration from FEATURES', () => {
    const lines = contratoVerificacion.source.split('\n');
    expect(lines.filter((line) => line.includes('-.->'))).toHaveLength(4);
    const ci = lines.find((line) => line.trim().startsWith('CI['));
    expect(ci).toContain(`:::${FEATURES.ci.status}`);
  });

  it('does not write styles, colours or scripts by hand', () => {
    expect(contratoVerificacion.source).not.toMatch(
      /classDef|linkStyle|\bstyle\b|%%\{|click |<script/,
    );
  });
});

// Structural pins: the claims of this stop that the repository can disprove ----------------------

describe('claims of stop 7 against the repository', () => {
  it('runs the API tests on SQLite with no Testcontainers and no HTTP test host', async () => {
    const csproj = await readRepoFile('api/tests/Pps.Domain.Tests/Pps.Domain.Tests.csproj');
    expect(csproj).toContain('Microsoft.EntityFrameworkCore.Sqlite');
    expect(csproj).not.toContain('Testcontainers');
    expect(await findRepoText({ in: ['api/tests/**'], pattern: 'WebApplicationFactory' })).toEqual(
      [],
    );
  }, 30_000);

  it('has web tests of pure logic only: no component tests and no browser runner', async () => {
    expect(matchRepoGlob('web/src/**/*.test.tsx')).toEqual([]);
    const config = await readRepoFile('web/vite.config.ts');
    expect(config).toContain("environment: 'node'");
    expect(config).toContain("include: ['src/**/*.test.ts']");
  });

  it('opens no real SVS in the tile tests', async () => {
    expect(await findRepoText({ in: ['tiles/tests/**'], pattern: 'svs|SVS' })).toEqual([]);
    const conftest = await readRepoFile('tiles/tests/conftest.py');
    expect(conftest).toContain('_draw_test_image');
  }, 30_000);

  it('keeps the contract checker out of any continuous integration', () => {
    expect(repoPathExists('scripts/check_contract.py')).toBe(true);
    expect(matchRepoGlob('.github/**')).toEqual([]);
  });

  it('has no HTTP script for the authorization matrix and no .gitattributes yet', () => {
    expect(matchRepoGlob('scripts/test_authz_matrix.*')).toEqual([]);
    expect(repoPathExists('.gitattributes')).toBe(false);
  });

  it('keeps the session-key volume of risk R8 and the contract version of the diagrams', async () => {
    expect(await readRepoFile('compose.yaml')).toContain('dpkeys:/keys');
    expect(await readRepoFile('contract/openapi/api.v1.yaml')).toMatch(/^\s*version: 0\.2\.0\s*$/m);
  });

  it('has one source for the matrix: 40 rows, one per operation of the contract', async () => {
    const matrix = await readRepoFile('contract/fixtures/authorization-matrix.json');
    const rows = (JSON.parse(matrix) as { rows: unknown[] }).rows;
    expect(rows).toHaveLength(FACTS.operations);
  });
});
