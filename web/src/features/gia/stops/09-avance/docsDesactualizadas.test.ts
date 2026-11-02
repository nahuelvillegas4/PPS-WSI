/**
 * Drift tests of annex A5 (outdated documents). They live beside the progress stop, which owns
 * the same evidence helper. Each row claims two things: that a document still says something, and
 * that the code says something else. Both are checked, so the row cannot go stale unnoticed.
 */
import { describe, expect, it } from 'vitest';
import {
  CLAIMS_DENYLIST,
  LEAK_DENYLIST,
  checkSectionShape,
  collectStrings,
  findDenied,
  stripEvidenceRef,
} from '../../drift/checks';
import { findRepoText, readRepoFile, repoPathExists } from '../../drift/repoFiles.testing';
import { DOC_ROWS, content, docsDesactualizadasTable } from '../../anexos/a5-docs-desactualizadas';
import { C8 } from '../08-decisiones/copy';

// C8 written out again on purpose: an edit of the shared copy must fail here (design 2).
const C8_TEXT =
  'desactualizado: pendiente de actualizar cuando la supervisión apruebe (ADR-15:108-115)';

describe('annex A5: documents that no longer match the code', () => {
  const table = docsDesactualizadasTable();

  it('is one table with the columns Archivo, Afirma and El código dice', () => {
    expect(content.section.group).toBe('anexo');
    expect(content.section.id).toBe('a5-docs-desactualizadas');
    expect(content.tables).toHaveLength(1);
    expect(table.id).toBe('docs-desactualizadas');
    expect(table.columns.map((column) => column.label)).toEqual([
      'Archivo',
      'Afirma',
      'El código dice',
    ]);
    expect(table.rows).toHaveLength(DOC_ROWS.length);
    expect(checkSectionShape(content.section)).toEqual([]);
  });

  it('still finds in each document the words the row says it claims', async () => {
    for (const row of DOC_ROWS) {
      expect(row.quotes.length, row.files).toBeGreaterThan(0);
      for (const quote of row.quotes) {
        const text = await readRepoFile(quote.file);
        expect(
          text.includes(quote.text),
          `${quote.file} ya no dice "${quote.text}": quitá la fila de A5 si se corrigió el documento`,
        ).toBe(true);
      }
    }
  });

  it('cites files that exist for what the code says', () => {
    for (const row of DOC_ROWS) {
      expect(row.evidence.length, row.files).toBeGreaterThan(0);
      for (const ref of row.evidence) expect(repoPathExists(stripEvidenceRef(ref)), ref).toBe(true);
    }
    for (const source of table.sources) {
      expect(repoPathExists(stripEvidenceRef(source.ref)), source.ref).toBe(true);
    }
  });

  it('uses C8 verbatim as the label of the roles row', () => {
    expect(C8).toBe(C8_TEXT);
    const roles = table.rows.find(
      (row) => typeof row.files === 'string' && row.files.includes('01 (restricciones)'),
    );
    expect(roles?.reality).toContain(C8_TEXT);
  });

  // What the code says today, for the rows whose answer is not a file name.
  it('is true that the volume is writable for the API only, and that the tests run on SQLite', async () => {
    const compose = await readRepoFile('compose.yaml');
    expect(
      compose.match(/\/data\/images\n/g),
      'la API monta el volumen con escritura',
    ).toHaveLength(1);
    expect(
      compose.match(/\/data\/images:ro/g),
      'las teselas lo montan de solo lectura',
    ).toHaveLength(1);
    const tests = await readRepoFile('api/tests/Pps.Domain.Tests/Pps.Domain.Tests.csproj');
    expect(tests).toContain('Microsoft.EntityFrameworkCore.Sqlite');
    expect(tests).not.toContain('Testcontainers');
    expect(await findRepoText({ in: ['api/tests/**'], pattern: 'WebApplicationFactory' })).toEqual(
      [],
    );
    // A scan of the API tests can pass the 5 s default when many workers run at once (audit C15).
  }, 30_000);

  it('is true that uploading needs image.upload and registering by key is for the global admin', async () => {
    const images = await readRepoFile('api/src/Pps.Api/Controllers/Images/ImagesController.cs');
    expect(images).toContain('[RequirePermission(Permission.ImageUpload)]');
    expect(images).toContain('[RequireGlobalAdmin]');
    const permissions = await readRepoFile('api/src/Pps.Domain/Access/Permission.cs');
    expect(permissions).toContain('ImageUpload');
  });

  it('is true that the contract is 0.2.0 and the web has more than the first screens', async () => {
    const contract = await readRepoFile('contract/README.md');
    expect(contract).toContain('Anexo A. Contrato de integración v0.2.0');
    const router = await readRepoFile('web/src/shared/router.ts');
    expect(router).toContain('members');
    expect(router).toContain('users');
  });

  // Audit C13: a dated logbook entry is a record of its day, not a document to fix.
  it('labels the logbook row as a historical record of 27/10', () => {
    const row = table.rows.find(
      (candidate) =>
        typeof candidate.files === 'string' && candidate.files.includes('BITACORA_PPS2'),
    );
    expect(row?.files).toContain('registro histórico del 27/10, describe el estado de ese día');
    expect(content.section.tabs[0]?.blocks[0]).toMatchObject({
      kind: 'callout',
      text: expect.stringContaining('La bitácora es un registro con fecha') as unknown,
    });
  });

  it('gives the authority to the code, and does not give it to ADRs that are still proposed', () => {
    expect(table.caption).toContain('Cuando hay diferencia, vale el código;');
    expect(table.caption).toContain(
      'los ADR propuestos todavía esperan la validación de la supervisión',
    );
    expect(table.caption).not.toContain('vale el código y el ADR');
  });

  // Audit C14: the architecture documents draw a generated client that the web does not have.
  it('is true that the web client is written by hand and has no openapi library', async () => {
    const row = DOC_ROWS.find((candidate) => candidate.files.includes('03 (línea 69)'));
    expect(row, 'the row about the generated client').toBeDefined();
    const pkg = await readRepoFile('web/package.json');
    expect(pkg).not.toMatch(/openapi-fetch|openapi-typescript/);
    const client = await readRepoFile('web/src/shared/api.ts');
    expect(client).toContain('Minimal HTTP client for the management API');
  });

  it('says nothing that the claims or leak denylists forbid', () => {
    const strings = collectStrings(content, 'annex');
    expect(strings.length).toBeGreaterThan(30);
    expect(findDenied(strings, CLAIMS_DENYLIST, { showMatch: true })).toEqual([]);
    expect(findDenied(strings, LEAK_DENYLIST)).toEqual([]);
  });
});
