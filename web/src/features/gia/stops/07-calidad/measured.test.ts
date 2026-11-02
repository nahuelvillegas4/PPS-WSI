import { describe, expect, it } from 'vitest';
import { MEASURED } from '../../data/measured';
import { matchRepoGlob, readRepoFile } from '../../drift/repoFiles.testing';
import { SNAPSHOT } from '../../model/status';
import { content as metricas, metricasTable } from '../../anexos/a4-metricas';
import { textOf } from './cells.testing';
import { describeMeasured, executionRecord, formatDate, formatNumber } from './measuredText';

const ENTRIES = Object.entries(MEASURED);

describe('MEASURED', () => {
  it('gives every number its date, the commit and the method', () => {
    expect(ENTRIES.length).toBeGreaterThan(0);
    for (const [key, entry] of ENTRIES) {
      expect(entry.asOf, key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entry.commit, key).toMatch(/^[0-9a-f]{7,40}$/);
      expect(entry.method.trim(), key).not.toBe('');
      expect(typeof entry.value === 'number' ? Number.isFinite(entry.value) : true, key).toBe(true);
    }
  });

  it('is never newer than the snapshot, and what is dated on it carries its commit', () => {
    for (const [key, entry] of ENTRIES) {
      expect(entry.asOf <= SNAPSHOT.date, `${key} is newer than the snapshot`).toBe(true);
      if (entry.asOf === SNAPSHOT.date) {
        expect(entry.commit, `${key} must be measured on the snapshot commit`).toBe(
          SNAPSHOT.commit,
        );
      }
    }
  });

  it('keeps the older performance figures dated before the membership check, with their caveat', () => {
    for (const entry of [MEASURED.tileColdOpenMs, MEASURED.tileP95Ms]) {
      expect(entry.asOf).toBe('2026-10-28');
      expect(entry.caveat).toContain('falta volver a medir');
    }
  });

  it('has no figure per person and no hours', () => {
    const person = /\b(horas?|autor(es)?|persona|gino|nahuel|commits? por)\b/i;
    for (const [key, entry] of ENTRIES) {
      expect(person.test(key), `${key}: key`).toBe(false);
      expect(person.test(entry.method), `${key}: method`).toBe(false);
      expect(person.test(entry.caveat ?? ''), `${key}: caveat`).toBe(false);
    }
  });

  it('adds the lines of code from the parts, not from a typed total', () => {
    const parts = [
      MEASURED.apiSourceLines,
      MEASURED.apiTestLines,
      MEASURED.webSourceLines,
      MEASURED.webStyleLines,
      MEASURED.webTestLines,
      MEASURED.tilesAppLines,
      MEASURED.tilesTestLines,
      MEASURED.scriptLines,
    ].reduce((sum, entry) => sum + entry.value, 0);
    expect(MEASURED.totalLines.value).toBe(parts);
    expect(parts).toBe(21860);
  });

  it('says that the API figure counts executions of 152 methods', () => {
    expect(MEASURED.apiTestCases.value).toBe(292);
    expect(MEASURED.apiTestMethods.value).toBe(152);
    expect(MEASURED.apiTestMethods.caveat).toContain('un [Theory] corre una vez por fila de datos');
  });

  it('counts the test declarations in the repository: 121 Fact and 31 Theory, 24 test functions of tiles', async () => {
    let facts = 0;
    let theories = 0;
    for (const path of matchRepoGlob('api/tests/**/*.cs')) {
      const text = await readRepoFile(path);
      facts += text.match(/\[Fact\b/g)?.length ?? 0;
      theories += text.match(/\[Theory\b/g)?.length ?? 0;
    }
    expect([facts, theories]).toEqual([121, 31]);
    expect(facts + theories).toBe(MEASURED.apiTestMethods.value);
    let functions = 0;
    for (const path of matchRepoGlob('tiles/tests/**/*.py')) {
      functions += (await readRepoFile(path)).match(/^\s*def test_/gm)?.length ?? 0;
    }
    expect(functions).toBe(MEASURED.tilesTestFunctions.value);
  }, 30_000);

  it('keeps the date and commit of each run: the API on 01/11, the web on the snapshot, tiles on 17/10', () => {
    expect([MEASURED.apiTestCases.asOf, MEASURED.apiTestCases.commit]).toEqual([
      '2026-11-01',
      '871f574',
    ]);
    expect([MEASURED.webTestCases.asOf, MEASURED.webTestCases.commit]).toEqual([
      SNAPSHOT.date,
      SNAPSHOT.commit,
    ]);
    expect([MEASURED.tilesTestFunctions.asOf, MEASURED.tilesTestFunctions.commit]).toEqual([
      '2026-10-17',
      'dc5f93c',
    ]);
    // What the repository can say about the code since those runs is part of the method.
    expect(MEASURED.apiTestCases.method).toContain('no cambió desde 871f574 hasta 2584cfc');
    expect(MEASURED.tilesTestFunctions.method).toContain('no cambió desde dc5f93c hasta 2584cfc');
    expect(MEASURED.tilesTestFunctions.method).not.toContain('corrida del equipo');
  });

  it('says that the web figure leaves out the tests of this guide', () => {
    expect(MEASURED.webTestCases.caveat).toContain('No incluye las pruebas de esta guía');
  });
});

describe('number and date formats', () => {
  it('groups thousands with a dot and keeps the decimal comma', () => {
    expect(formatNumber(8349)).toBe('8.349');
    expect(formatNumber(21860)).toBe('21.860');
    expect(formatNumber(289)).toBe('289');
    expect(formatNumber(110.9)).toBe('110,9');
    expect(formatNumber(11.62)).toBe('11,62');
    expect(formatNumber('1.5 s')).toBe('1.5 s');
  });

  it('writes dates as dd/mm/yyyy', () => {
    expect(formatDate('2026-11-02')).toBe('02/11/2026');
  });

  it('explains a measurement with its method, date, commit and caveat', () => {
    const text = describeMeasured({
      value: 1,
      asOf: '2026-11-02',
      commit: '2584cfc',
      method: 'Conteo con git',
      caveat: 'Sin las pruebas.',
    });
    expect(text).toBe('Conteo con git. Medido el 02/11/2026 · commit 2584cfc. Sin las pruebas.');
  });
});

describe('copy C4', () => {
  it('is the execution record with a date and a commit per suite and the 152-method explanation', () => {
    expect(executionRecord()).toBe(
      'Cada suite, con su fecha: API 292 casos (152 métodos; corrida del 01/11 en contenedor; el código de la API no cambió desde 871f574) · Web 284/284 (02/11, copia exportada de 2584cfc, sin las pruebas de esta guía) · Tiles 24/24 (última corrida registrada el 17/10; el código no cambió desde entonces). Pruebas de API sobre SQLite, sin capa HTTP.',
    );
  });

  it('never says the suites ran on HEAD or all on the snapshot date', () => {
    const text = executionRecord();
    expect(text).not.toMatch(/HEAD|Ejecutado el/);
  });
});

describe('table metricas (annex A4)', () => {
  const rows = metricasTable.rows;
  const concepts = rows.map((row) => row.concept);

  it('has no row that is a person or an hour count', () => {
    expect(concepts.some((concept) => /hora|autor|persona/i.test(textOf(concept)))).toBe(false);
  });

  it('shows the numbers of the system from FACTS and every measured one with its stamp', () => {
    expect(concepts).toContain('Operaciones de la API');
    expect(concepts).toContain('Total de código, estilos y pruebas');
    const stamped = rows.filter(
      (row) => !textOf(row.how).includes('se compara con el repositorio'),
    );
    expect(stamped.length).toBeGreaterThan(0);
    for (const row of stamped) {
      expect(textOf(row.how), textOf(row.concept)).toMatch(
        /Medido el \d{2}\/\d{2}\/\d{4} · commit [0-9a-f]{7}\./,
      );
    }
  });

  it('stamps the API and the tiles with the date and commit of their own run', () => {
    const how = (concept: string) =>
      textOf(rows.find((row) => textOf(row.concept) === concept)?.how);
    expect(how('Pruebas de la API: casos ejecutados')).toContain(
      'Medido el 01/11/2026 · commit 871f574.',
    );
    expect(how('Pruebas de teselas: casos')).toContain('Medido el 17/10/2026 · commit dc5f93c.');
    expect(how('Pruebas de la web: casos ejecutados')).toContain(
      `Medido el 02/11/2026 · commit ${SNAPSHOT.commit}.`,
    );
  });

  it('takes the tables of the model from the snapshot of the data context, not from the context file', () => {
    const tables = rows.find((row) => textOf(row.concept) === 'Tablas');
    expect(textOf(tables?.how)).toContain('AppDbContextModelSnapshot.cs');
    expect(textOf(tables?.how)).not.toContain('contexto de datos');
  });

  it('tells that the web and repository figures predate this guide', () => {
    const callout = metricas.section.tabs
      .flatMap((tab) => tab.blocks)
      .find((b) => b.kind === 'callout');
    expect(callout?.kind === 'callout' ? callout.text : '').toContain(
      `son del commit ${SNAPSHOT.commit}, anterior a esta guía`,
    );
  });

  it('calls the 79 rows the team breakdown, not requirements of the statements', () => {
    const row = rows.find((item) => textOf(item.concept).startsWith('Requisitos de las dos PPS'));
    expect(textOf(row?.concept)).toContain('desglose propio');
  });

  it('is defined by the annex and shown once', () => {
    expect(metricas.tables.map((table) => table.id)).toEqual(['metricas']);
    const blocks = metricas.section.tabs.flatMap((tab) => tab.blocks);
    expect(blocks.filter((item) => item.kind === 'table')).toEqual([
      { kind: 'table', id: 'metricas' },
    ]);
  });
});
