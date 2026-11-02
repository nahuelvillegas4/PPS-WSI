import { describe, expect, it } from 'vitest';
import type { FeatureDef } from '../model/features';
import type { Evidence } from '../model/status';
import type { AdrRow, DiagramDef, Requirement, Section, TableDef } from '../model/types';
import {
  CLAIMS_DENYLIST,
  LEAK_DENYLIST,
  checkAdrTableRows,
  checkAdrs,
  checkBlockReferences,
  checkBuiltClaimsHaveProof,
  checkFeatureDefinitions,
  checkMeasured,
  checkRequirements,
  checkSectionShape,
  checkStepperNotes,
  checkWalkthroughMinutes,
  collectBlockRefs,
  collectEvidence,
  collectStrings,
  contentStrings,
  evidenceFormatProblems,
  findDenied,
  findDuplicates,
  findEnvValueLeaks,
  findEvidenceProblems,
  findInvalidIds,
  findRegisteredApprovals,
  formatSnapshotLabel,
  hasBuiltProof,
  isSnapshotStale,
  parseAdrIndex,
  parseEnv,
  parseIsoDate,
  stripEvidenceRef,
  tripwireHits,
  tripwireMessage,
  tripwireProblems,
  type Located,
  type RepoProbe,
} from './checks';

// Builders of synthetic content ---------------------------------------------------------------

function section(overrides: Partial<Section> = {}): Section {
  return {
    id: 'demo',
    group: 'recorrido',
    title: 'Demo',
    headline: 'Una frase corta.',
    minutes: 2,
    tabs: [{ id: 'uno', label: 'Uno', blocks: [{ kind: 'list', items: ['a'] }] }],
    notes: ['Primera.', 'Segunda.'],
    ...overrides,
  };
}

function table(overrides: Partial<TableDef> = {}): TableDef {
  return {
    id: 't',
    title: 'T',
    columns: [{ key: 'a', label: 'A' }],
    rows: [{ a: 'x' }],
    sources: [],
    ...overrides,
  };
}

function diagram(overrides: Partial<DiagramDef> = {}): DiagramDef {
  return {
    id: 'd',
    kind: 'flowchart',
    title: 'D',
    summary: 's',
    source: 'flowchart LR\n  A["a"] --> B["b"]',
    usesStatus: false,
    sources: [],
    priority: 'P1',
    ...overrides,
  };
}

const CODE: Evidence = { kind: 'code', ref: 'web/src/app/App.tsx:10-20' };
const MANUAL: Evidence = { kind: 'manual', ref: 'verificación del equipo' };

function located(...texts: string[]): Located[] {
  return texts.map((text, index) => ({ path: `s${index}`, text }));
}

// Walking the content ---------------------------------------------------------------------------

describe('collectStrings', () => {
  it('finds every string value in nested objects and arrays, with a readable path', () => {
    const found = collectStrings({
      title: 'Hola',
      count: 3,
      flag: true,
      nothing: null,
      blocks: [{ id: 'uno', text: 'a' }, ['b', 4]],
    });
    expect(found).toEqual([
      { path: '$.title', text: 'Hola' },
      { path: '$.blocks[id=uno].id', text: 'uno' },
      { path: '$.blocks[id=uno].text', text: 'a' },
      { path: '$.blocks[1][0]', text: 'b' },
    ]);
  });

  it('does not collect object keys and survives a cycle', () => {
    const cyclic: Record<string, unknown> = { secretKey: 'value' };
    cyclic.self = cyclic;
    expect(collectStrings(cyclic).map((hit) => hit.text)).toEqual(['value']);
  });

  it('reaches evidence notes and diagram sources through contentStrings', () => {
    const all = contentStrings({
      sections: [section({ headline: 'Titular' })],
      diagrams: [
        diagram({ source: 'flowchart LR', sources: [{ ...CODE, note: 'nota de evidencia' }] }),
      ],
      tables: [table({ rows: [{ a: 'celda' }], sources: [{ ...CODE, note: 'otra nota' }] })],
    });
    const texts = all.map((hit) => hit.text);
    expect(texts).toEqual(
      expect.arrayContaining([
        'Titular',
        'flowchart LR',
        'nota de evidencia',
        'celda',
        'otra nota',
      ]),
    );
  });
});

// Leaks and claims --------------------------------------------------------------------------------

describe('leak denylist', () => {
  it.each([
    'la contraseña es password',
    'Password: x',
    'POSTGRES_USER',
    'usuario gia_user',
    'base gia_db',
    'valor change_me',
    'cabecera X-Storage-Key',
    'cabecera x-storage-key',
    'ruta /internal/tile-access',
    'carpeta scanslide',
    'puerto :5432',
    'puerto :8081',
    'puerto :8080',
    'puerto :8000',
    'host 127.0.0.1',
    'host localhost',
    'archivo .env',
    'SECRET=abc',
    'API_TOKEN: abc',
  ])('rejects %s', (text) => {
    expect(findDenied(located(text), LEAK_DENYLIST)).toHaveLength(1);
  });

  it.each([
    'password_hash',
    'Columna password_hash en users',
    'Pasarela, API, teselas y base de datos',
    'El puerto es interno',
    'TOKEN sin valor',
    'secret = x en minúsculas',
    'intervalo 10:80',
    // The folder of a real source file is not the route.
    'api/src/Pps.Api/Controllers/Internal/TileAccessController.cs:29-74',
  ])('accepts %s', (text) => {
    expect(findDenied(located(text), LEAK_DENYLIST)).toEqual([]);
  });

  it('names where the term is and never echoes it', () => {
    const problems = findDenied(
      [{ path: 'tables[id=x].rows[0].a', text: 'SECRET=hunter22' }],
      LEAK_DENYLIST,
    );
    expect(problems).toEqual([
      'tables[id=x].rows[0].a: contains denied term SECRET/TOKEN assignment',
    ]);
    expect(problems.join('')).not.toContain('hunter22');
  });
});

describe('claims denylist', () => {
  it.each([
    'ADR aceptado',
    'ACEPTADO',
    'cambio aprobado',
    'cambio aprobada',
    'ruta protegida',
    'teselas protegidos',
    'conexión segura',
    'sistema seguro',
    'solo accesible desde el laboratorio',
    'sólo accesible',
  ])('rejects %s', (text) => {
    expect(findDenied(located(text), CLAIMS_DENYLIST)).toHaveLength(1);
  });

  it.each([
    'pendiente de aprobación escrita',
    'la aprobación NO REGISTRADA',
    'seguridad y deuda técnica',
    'asegurar que no se pierda',
    'solo la interfaz oculta',
    'ADR propuesto',
  ])('accepts %s', (text) => {
    expect(findDenied(located(text), CLAIMS_DENYLIST, { showMatch: true })).toEqual([]);
  });

  it('shows the offending fragment when asked', () => {
    expect(
      findDenied(located('el cambio fue aprobado ayer'), CLAIMS_DENYLIST, { showMatch: true }),
    ).toEqual(['s0: contains denied term aprobado/aprobada ("aprobado")']);
  });
});

describe('.env value leaks', () => {
  const env = [
    'a comment',
    '# POSTGRES_PASSWORD=ignored',
    '',
    'DB_PASS=correct-horse',
    'export API_KEY="quoted value 99"',
    "MODE='dev-mode' # trailing comment",
    'SHORT=abc',
    'PORT=8080 # comment',
    'not a pair',
  ].join('\r\n');

  it('parses keys and values, skipping comments, quotes and inline comments', () => {
    expect(parseEnv(env)).toEqual([
      { key: 'DB_PASS', value: 'correct-horse' },
      { key: 'API_KEY', value: 'quoted value 99' },
      { key: 'MODE', value: 'dev-mode' },
      { key: 'SHORT', value: 'abc' },
      { key: 'PORT', value: '8080' },
    ]);
  });

  it('flags values of six characters or more by key, never by value', () => {
    const problems = findEnvValueLeaks(parseEnv(env), [
      { path: 'sections[id=a].notes[0]', text: 'la clave es correct-horse en el texto' },
      { path: 'tables[id=b].rows[1].c', text: 'abc 8080 dev' },
    ]);
    expect(problems).toEqual([
      'sections[id=a].notes[0]: contains the value of the .env variable DB_PASS',
    ]);
    expect(problems.join('')).not.toContain('correct-horse');
  });

  it('honours a custom minimum length', () => {
    const entries = parseEnv('PORT=8080');
    expect(findEnvValueLeaks(entries, located('el 8080'))).toEqual([]);
    expect(findEnvValueLeaks(entries, located('el 8080'), 4)).toHaveLength(1);
  });
});

describe('findRegisteredApprovals', () => {
  it('rejects a REGISTRADA approval anywhere in a table, footer included', () => {
    const bad = table({
      id: 'alcance',
      rows: [
        { a: 'Roles', b: { approval: 'NO_REGISTRADA' } },
        { a: 'Subida', b: { approval: 'REGISTRADA' } },
      ],
      footer: { a: 'Total', b: { approval: 'REGISTRADA' } },
    });
    const problems = findRegisteredApprovals([bad]);
    expect(problems).toHaveLength(2);
    expect(problems[0]).toContain('table alcance, row 1 ("Subida"), column b');
  });

  it('accepts the unrecorded and pending approvals', () => {
    const ok = table({
      rows: [
        { a: 'x', b: { approval: 'NO_REGISTRADA' } },
        { a: 'y', b: { approval: 'PENDIENTE' } },
      ],
    });
    expect(findRegisteredApprovals([ok])).toEqual([]);
  });
});

// Identifiers and section shape --------------------------------------------------------------------

describe('identifiers', () => {
  it('reports each repeated id once', () => {
    expect(findDuplicates(['a', 'b', 'a', 'a', 'c', 'b'], 'table')).toEqual([
      'duplicate table id: a',
      'duplicate table id: b',
    ]);
    expect(findDuplicates(['a', 'b'], 'table')).toEqual([]);
  });

  it('accepts lowercase slugs only', () => {
    expect(findInvalidIds(['tesela', 'api-40', 'er-implementado'], 'diagram')).toEqual([]);
    expect(findInvalidIds(['G07', 'a_b', '-x', 'x-', 'a--b', '9a', ''], 'diagram')).toHaveLength(7);
  });
});

describe('checkSectionShape', () => {
  it('accepts a well-formed stop and annex', () => {
    expect(checkSectionShape(section())).toEqual([]);
    expect(checkSectionShape(section({ group: 'anexo', minutes: undefined }))).toEqual([]);
  });

  it('limits the headline to 90 characters', () => {
    expect(checkSectionShape(section({ headline: 'x'.repeat(90) }))).toEqual([]);
    expect(checkSectionShape(section({ headline: 'x'.repeat(91) }))).toEqual([
      'section demo: headline has 91 characters (at most 90)',
    ]);
  });

  it('wants two to four speaker notes, none empty', () => {
    expect(checkSectionShape(section({ notes: ['uno'] }))[0]).toContain('has 1 speaker notes');
    expect(checkSectionShape(section({ notes: ['a', 'b', 'c', 'd', 'e'] }))[0]).toContain(
      'has 5 speaker notes',
    );
    expect(checkSectionShape(section({ notes: ['a', 'b', 'c', 'd'] }))).toEqual([]);
    expect(checkSectionShape(section({ notes: ['a', '  '] }))).toEqual([
      'section demo: has an empty speaker note',
    ]);
  });

  it('checks tabs and footnotes', () => {
    const tabs = [
      { id: 'uno', label: 'Uno', blocks: [{ kind: 'list' as const, items: [] }] },
      { id: 'uno', label: '', blocks: [] },
    ];
    const problems = checkSectionShape(
      section({
        tabs,
        footnotes: [
          { id: 'f', text: 'a' },
          { id: 'f', text: 'b' },
        ],
      }),
    );
    expect(problems).toEqual(
      expect.arrayContaining([
        'duplicate tab of demo id: uno',
        'section demo, tab uno: empty label',
        'section demo, tab uno: has no blocks',
        'duplicate footnote of demo id: f',
      ]),
    );
    expect(checkSectionShape(section({ tabs: [] }))).toContain('section demo: has no tabs');
  });

  it('gives minutes to the walk-through stops and to nothing else', () => {
    expect(checkSectionShape(section({ minutes: undefined }))[0]).toContain('needs minutes');
    expect(checkSectionShape(section({ minutes: 0 }))[0]).toContain('needs minutes');
    expect(checkSectionShape(section({ group: 'anexo', minutes: 1 }))[0]).toContain(
      'annex has no minutes',
    );
  });
});

describe('checkWalkthroughMinutes', () => {
  const stops = (...minutes: number[]): Section[] =>
    minutes.map((m, i) => section({ id: `s${i}`, minutes: m }));

  it('accepts a total between 18 and 24 minutes, bounds included', () => {
    expect(checkWalkthroughMinutes(stops(18))).toEqual([]);
    expect(checkWalkthroughMinutes(stops(10, 12.5))).toEqual([]);
    expect(checkWalkthroughMinutes(stops(24))).toEqual([]);
  });

  it('rejects a talk that is too short or too long, and ignores annexes', () => {
    expect(checkWalkthroughMinutes(stops(17.5))[0]).toContain('17.5 minutes');
    expect(checkWalkthroughMinutes(stops(24.5))[0]).toContain('24.5 minutes');
    const withAnnex = [...stops(10), section({ id: 'a1', group: 'anexo', minutes: 30 })];
    expect(checkWalkthroughMinutes(withAnnex)[0]).toContain('10 minutes');
  });
});

// Block references -----------------------------------------------------------------------------------

describe('checkBlockReferences', () => {
  const withBlocks = (
    id: string,
    ...blocks: Section['tabs'][number]['blocks'][number][]
  ): Section => section({ id, tabs: [{ id: 'uno', label: 'Uno', blocks }] });

  it('accepts one block per diagram and at least one per table', () => {
    const sections = [
      withBlocks('a', { kind: 'diagram', id: 'd1' }, { kind: 'table', id: 't1' }),
      withBlocks('b', { kind: 'diagram', id: 'd2' }, { kind: 'table', id: 't1' }),
    ];
    // t1 is shown twice and is not on the allow-list.
    expect(checkBlockReferences(sections, ['d1', 'd2'], ['t1'], ['t1'])).toEqual([]);
  });

  it('finds references to ids that do not exist, in tabs and in detail', () => {
    const sections = [
      section({
        id: 'a',
        detail: [{ kind: 'diagram', id: 'ghost' }],
        tabs: [{ id: 'uno', label: 'Uno', blocks: [{ kind: 'table', id: 'nothing' }] }],
      }),
    ];
    expect(checkBlockReferences(sections, [], [])).toEqual([
      'unknown diagram ghost referenced by section a',
      'unknown table nothing referenced by section a',
    ]);
  });

  it('finds diagrams that are never shown or shown more than once', () => {
    const sections = [
      withBlocks('a', { kind: 'diagram', id: 'twice' }),
      withBlocks('b', { kind: 'diagram', id: 'twice' }),
    ];
    const problems = checkBlockReferences(sections, ['twice', 'orphan'], []);
    expect(problems).toEqual([
      'diagram twice is referenced 2 times (a, b); it must appear exactly once',
      'diagram orphan is not referenced by any block',
    ]);
  });

  it('lets only the allow-listed tables appear, and exactly twice', () => {
    const sections = [
      withBlocks(
        'a',
        { kind: 'table', id: 'pantallas' },
        { kind: 'table', id: 'qs' },
        { kind: 'table', id: 'plain' },
      ),
      withBlocks('b', { kind: 'table', id: 'pantallas' }, { kind: 'table', id: 'plain' }),
    ];
    const problems = checkBlockReferences(sections, [], ['pantallas', 'qs', 'plain', 'unused']);
    expect(problems).toEqual([
      'table qs must appear exactly twice, found 1 (a)',
      'table plain is referenced 2 times (a, b); only pantallas and qs may repeat',
      'table unused is not referenced by any block',
    ]);
  });

  it('counts the references of every block kind', () => {
    const refs = collectBlockRefs([
      withBlocks('a', { kind: 'diagram', id: 'd' }, { kind: 'callout', tone: 'info', text: 'x' }),
    ]);
    expect([...refs.diagrams]).toEqual([['d', ['a']]]);
    expect(refs.tables.size).toBe(0);
  });
});

// Status rules ----------------------------------------------------------------------------------------

describe('hasBuiltProof', () => {
  it('counts code, test, contract, config and dated run evidence', () => {
    for (const kind of ['code', 'test', 'contract', 'config'] as const) {
      expect(hasBuiltProof([{ kind, ref: 'a/b.ts' }])).toBe(true);
    }
    expect(
      hasBuiltProof([{ kind: 'run', ref: 'run:2026-11-02 npm test', note: 'sobre 2584cfc' }]),
    ).toBe(true);
  });

  it('never accepts manual, doc, adr or git evidence alone, nor an undated run', () => {
    expect(hasBuiltProof([])).toBe(false);
    expect(hasBuiltProof([MANUAL])).toBe(false);
    expect(hasBuiltProof([{ kind: 'doc', ref: 'docs/a.md' }])).toBe(false);
    expect(hasBuiltProof([{ kind: 'adr', ref: 'docs/adr/0001.md' }])).toBe(false);
    expect(hasBuiltProof([{ kind: 'git', ref: 'git:2584cfc' }])).toBe(false);
    expect(hasBuiltProof([{ kind: 'run', ref: 'run:2026-11-02 npm test' }])).toBe(false);
    expect(hasBuiltProof([MANUAL, { kind: 'doc', ref: 'docs/a.md' }])).toBe(false);
    expect(hasBuiltProof([MANUAL, CODE])).toBe(true);
  });
});

describe('checkBuiltClaimsHaveProof', () => {
  const built = table({ id: 'built', rows: [{ a: { status: 'done' } }] });
  const chips = table({
    id: 'chips',
    rows: [{ a: { chips: [{ label: 'x', status: 'partial' }] } }],
  });
  const planned = table({
    id: 'planned',
    rows: [{ a: { status: 'planned' } }, { a: { status: 'unknown' } }],
  });

  it('asks for proof from tables that show done or partial items', () => {
    const problems = checkBuiltClaimsHaveProof([built, chips, planned], []);
    expect(problems).toHaveLength(2);
    expect(problems[0]).toContain('table built');
    expect(problems[1]).toContain('table chips');
  });

  it('is satisfied by code evidence and not by manual evidence', () => {
    expect(checkBuiltClaimsHaveProof([{ ...built, sources: [CODE] }], [])).toEqual([]);
    expect(checkBuiltClaimsHaveProof([{ ...built, sources: [MANUAL] }], [])).toHaveLength(1);
  });

  it('looks at the glyphs of diagrams that use the status classes', () => {
    const partial = diagram({
      id: 'p',
      usesStatus: true,
      source: 'flowchart LR\n  A["◐ a"]:::partial',
    });
    const done = diagram({ id: 'o', usesStatus: true, source: 'flowchart LR\n  A["● a"]:::done' });
    const onlyPlanned = diagram({
      id: 'n',
      usesStatus: true,
      source: 'flowchart LR\n  A["○ a"]:::planned',
    });
    const noStatus = diagram({ id: 'x', usesStatus: false, source: 'flowchart LR\n  A["● a"]' });
    const problems = checkBuiltClaimsHaveProof([], [partial, done, onlyPlanned, noStatus]);
    expect(problems.map((problem) => problem.split(' ')[1])).toEqual(['p', 'o']);
    expect(checkBuiltClaimsHaveProof([], [{ ...done, sources: [CODE] }])).toEqual([]);
  });
});

describe('checkStepperNotes', () => {
  const stepper = (
    steps: { id: string; api: 'done' | 'planned'; web: 'done' | 'partial'; note?: string }[],
  ): Section =>
    section({
      tabs: [
        {
          id: 'uno',
          label: 'Uno',
          blocks: [{ kind: 'stepper', steps: steps.map((s) => ({ ...s, title: s.id })) }],
        },
      ],
    });

  it('accepts finished steps and unfinished ones that explain the gap', () => {
    expect(
      checkStepperNotes([
        stepper([
          { id: 'a', api: 'done', web: 'done' },
          { id: 'b', api: 'done', web: 'partial', note: 'clases sin pantalla' },
        ]),
      ]),
    ).toEqual([]);
  });

  it('rejects an unfinished step without a note', () => {
    const problems = checkStepperNotes([
      stepper([
        { id: 'b', api: 'done', web: 'partial' },
        { id: 'c', api: 'planned', web: 'done', note: '  ' },
      ]),
    ]);
    expect(problems).toHaveLength(2);
    expect(problems[0]).toContain('step b');
  });
});

describe('checkFeatureDefinitions', () => {
  const planned: FeatureDef = {
    label: 'Cosa',
    status: 'planned',
    gap: 'Falta construirla.',
    absentPaths: ['a/**'],
  };

  it('accepts planned items with a gap sentence and a tripwire', () => {
    expect(
      checkFeatureDefinitions({
        a: planned,
        b: { ...planned, absentPaths: undefined, absentText: { in: ['web/**'], pattern: 'Cosa' } },
        done: { label: 'Hecha', status: 'done', gap: '' },
      }),
    ).toEqual([]);
  });

  it('rejects a missing gap sentence, a missing tripwire and a broken pattern', () => {
    expect(checkFeatureDefinitions({ a: { ...planned, gap: ' ' } })).toEqual([
      'feature a: status planned but no gap sentence',
    ]);
    expect(checkFeatureDefinitions({ a: { ...planned, absentPaths: [] } })).toEqual([
      'feature a: status planned but no tripwire (absentPaths or absentText)',
    ]);
    expect(
      checkFeatureDefinitions({
        a: { ...planned, absentPaths: undefined, absentText: { in: ['x/**'], pattern: '(' } },
      }),
    ).toEqual(['feature a: absentText pattern is not a valid regular expression']);
  });
});

describe('tripwires', () => {
  const probe = (files: string[], textHits: string[] = []): RepoProbe => ({
    matchGlob: (glob) => files.filter((file) => file.startsWith(glob.replace('**', ''))),
    findText: () => Promise.resolve(textHits),
  });
  const def: FeatureDef = {
    label: 'Editor de anotaciones',
    status: 'planned',
    gap: 'x',
    absentPaths: ['web/src/features/annotations/**'],
    absentText: { in: ['web/src/**'], pattern: 'Editor' },
  };

  it('finds nothing while the planned item is still absent', async () => {
    const hits = await tripwireHits(def, probe(['web/src/app/App.tsx']));
    expect(hits).toEqual([]);
    expect(tripwireProblems(def, hits)).toEqual([]);
  });

  it('trips on a file under the glob and on a text hit, once per path', async () => {
    const hits = await tripwireHits(
      def,
      probe(
        ['web/src/features/annotations/Editor.tsx'],
        ['web/src/features/annotations/Editor.tsx', 'web/src/x.ts'],
      ),
    );
    expect(hits).toEqual(['web/src/features/annotations/Editor.tsx', 'web/src/x.ts']);
  });

  it('says exactly which entry to update', () => {
    expect(tripwireProblems(def, ['web/src/x.ts'])).toEqual([
      'El ítem Editor de anotaciones figura como planificado en /gia pero ya existe: actualizá model/features.ts y el contenido',
    ]);
    expect(tripwireMessage('Pantalla de clases')).toBe(
      'El ítem Pantalla de clases figura como planificado en /gia pero ya existe: actualizá model/features.ts y el contenido',
    );
  });
});

describe('checkRequirements', () => {
  const base: Requirement = {
    id: 'P1-1',
    pps: 1,
    text: 'Algo',
    state: 'implemented',
    evidence: 'api/x.cs:1',
  };

  it('accepts built requirements with evidence and open ones with a theme', () => {
    expect(
      checkRequirements([
        base,
        { ...base, id: 'P1-2', state: 'partial', theme: 'editor' },
        { ...base, id: 'P1-3', state: 'not-started', evidence: '', theme: 'servidor' },
      ]),
    ).toEqual([]);
  });

  it('rejects missing evidence, missing theme, empty text and repeated ids', () => {
    expect(checkRequirements([{ ...base, evidence: ' ' }])).toEqual([
      'requirement P1-1: state implemented but no evidence',
    ]);
    expect(checkRequirements([{ ...base, state: 'planned' }])).toEqual([
      'requirement P1-1: state planned but no gap theme',
    ]);
    expect(checkRequirements([{ ...base, text: '' }])).toEqual(['requirement P1-1: empty text']);
    expect(checkRequirements([base, base])).toEqual(['duplicate requirement id: P1-1']);
  });
});

describe('ADR checks', () => {
  const markdown = [
    '| ADR | Decisión | Estado |',
    '|---|---|---|',
    '| [ADR-01](0001-spa.md) | SPA y dos servicios | `DECIDIDO` |',
    '| [ADR-04](0004-sesion.md) | Sesión por cookie | `DECIDIDO` · roles reemplazados por [ADR-15](0015-roles.md) (`PROPUESTO`) |',
    '| [ADR-07](0007-modelo.md) | Modelo de datos | `PROPUESTO` |',
    '| [ADR-15](0015-roles.md) | Roles por proyecto | `PROPUESTO` |',
    'texto suelto con [ADR-02](x.md) `DECIDIDO`',
  ].join('\r\n');
  const index = parseAdrIndex(markdown);

  it('reads the decision of each ADR from the index table', () => {
    expect([...index]).toEqual([
      [1, 'DECIDIDO'],
      [4, 'DECIDIDO'],
      [7, 'PROPUESTO'],
      [15, 'PROPUESTO'],
    ]);
  });

  const row = (n: number, overrides: Partial<AdrRow> = {}): AdrRow => ({
    n,
    title: `ADR ${n}`,
    decision: 'PROPUESTO',
    inCode: 'done',
    sentence: 'Una frase.',
    ...overrides,
  });
  const fullIndex = new Map(
    [1, 4, 7, 8, 9, 10, 15, 16, 17].map(
      (n) => [n, [1, 4].includes(n) ? 'DECIDIDO' : 'PROPUESTO'] as const,
    ),
  );
  const proposed = [7, 8, 9, 10, 15, 16, 17].map((n) => row(n));

  it('accepts rows equal to the index with every proposed ADR proposed', () => {
    expect(
      checkAdrs(
        [row(1, { decision: 'DECIDIDO' }), row(4, { decision: 'DECIDIDO' }), ...proposed],
        fullIndex,
      ),
    ).toEqual([]);
  });

  it('rejects a row that differs from the index', () => {
    expect(checkAdrs([row(1, { decision: 'PROPUESTO' }), ...proposed], fullIndex)).toEqual([
      'ADR-1: the page says PROPUESTO, docs/adr/README.md says DECIDIDO',
    ]);
    expect(checkAdrs([row(2), ...proposed], fullIndex)).toEqual([
      'ADR-2: not listed in docs/adr/README.md',
    ]);
  });

  it('requires every proposed ADR, still proposed, without accepted or approved wording', () => {
    expect(
      checkAdrs(
        proposed.filter((r) => r.n !== 16),
        fullIndex,
      ),
    ).toEqual(['ADR-16: missing from the ADR data of the page']);
    const decided = proposed.map((r) => (r.n === 15 ? { ...r, decision: 'DECIDIDO' as const } : r));
    expect(checkAdrs(decided, fullIndex)).toEqual(
      expect.arrayContaining(['ADR-15: must be PROPUESTO on the page, found DECIDIDO']),
    );
    for (const text of ['ADR aceptado', 'Fue aprobada', 'APROBADO por la supervisión']) {
      const worded = proposed.map((r) => (r.n === 9 ? { ...r, sentence: text } : r));
      expect(checkAdrs(worded, fullIndex)).toEqual([
        'ADR-9: its text says aceptado or aprobado/aprobada, but it is only proposed',
      ]);
    }
    const aprobacion = proposed.map((r) =>
      r.n === 9 ? { ...r, sentence: 'Espera la aprobación escrita.' } : r,
    );
    expect(checkAdrs(aprobacion, fullIndex)).toEqual([]);
  });

  it('tells when the index itself no longer says PROPUESTO', () => {
    const moved = new Map(fullIndex).set(15, 'DECIDIDO');
    expect(checkAdrs(proposed, moved).join('\n')).toContain(
      'docs/adr/README.md no longer lists it as PROPUESTO',
    );
  });

  it('wants a pending sentence when the ADR is only partly in code', () => {
    const partial = proposed.map((r) => (r.n === 7 ? { ...r, inCode: 'partial' as const } : r));
    expect(checkAdrs(partial, fullIndex)).toEqual([
      'ADR-7: only partly in code but no pending sentence',
    ]);
    const explained = proposed.map((r) =>
      r.n === 7 ? { ...r, inCode: 'partial' as const, pending: 'Falta X.' } : r,
    );
    expect(checkAdrs(explained, fullIndex)).toEqual([]);
  });

  it('checks table rows identified by an ADR id cell against the index', () => {
    const adrs = table({
      id: 'adrs',
      rows: [
        { n: 'ADR-07', d: { decision: 'PROPUESTO' } },
        { n: { mono: 'ADR-15' }, d: { decision: 'DECIDIDO' } },
        { n: 'ADR-01', d: { decision: 'DECIDIDO' } },
        { n: 'Sin id', d: { decision: 'DECIDIDO' } },
      ],
    });
    expect(checkAdrTableRows([adrs], index)).toEqual([
      'table adrs, row 1: ADR-15 shows DECIDIDO, docs/adr/README.md says PROPUESTO',
    ]);
  });
});

describe('checkMeasured', () => {
  const ok = { value: 284, asOf: '2026-11-02', commit: '2584cfc', method: 'npm test' };

  it('accepts a dated, stamped measurement not newer than the snapshot', () => {
    expect(checkMeasured({ web: ok, label: { ...ok, value: '284/284' } }, '2026-11-02')).toEqual(
      [],
    );
  });

  it('rejects a missing date, commit or method, and a measurement after the snapshot', () => {
    expect(checkMeasured({ a: { ...ok, asOf: '02/11/2026' } }, '2026-11-02')).toEqual([
      'measured a: asOf "02/11/2026" is not a YYYY-MM-DD date',
    ]);
    expect(checkMeasured({ a: { ...ok, commit: 'HEAD' } }, '2026-11-02')).toEqual([
      'measured a: commit is not a sha',
    ]);
    expect(checkMeasured({ a: { ...ok, method: ' ' } }, '2026-11-02')).toEqual([
      'measured a: empty method',
    ]);
    expect(checkMeasured({ a: { ...ok, value: ' ' } }, '2026-11-02')).toEqual([
      'measured a: empty value',
    ]);
    expect(checkMeasured({ a: { ...ok, asOf: '2026-11-03' } }, '2026-11-02')).toEqual([
      'measured a: measured on 2026-11-03, after the snapshot of 2026-11-02',
    ]);
  });
});

// Evidence ---------------------------------------------------------------------------------------------

describe('evidence refs', () => {
  it('strips the line range and the symbol', () => {
    expect(stripEvidenceRef('api/src/A.cs')).toBe('api/src/A.cs');
    expect(stripEvidenceRef('api/src/A.cs:12')).toBe('api/src/A.cs');
    expect(stripEvidenceRef('api/src/A.cs:12-30')).toBe('api/src/A.cs');
    expect(stripEvidenceRef('api/src/A.cs#Decide')).toBe('api/src/A.cs');
    expect(stripEvidenceRef('api/src/A.cs:12-30#Decide')).toBe('api/src/A.cs');
  });

  it('checks the format of git, run, manual and path refs', () => {
    expect(evidenceFormatProblems({ kind: 'git', ref: 'git:2584cfc' })).toEqual([]);
    expect(evidenceFormatProblems({ kind: 'git', ref: '2584cfc' })).toHaveLength(1);
    expect(evidenceFormatProblems({ kind: 'git', ref: 'git:zzzzzzz' })).toHaveLength(1);
    expect(
      evidenceFormatProblems({ kind: 'run', ref: 'run:2026-11-02 npm test', note: 'HEAD 2584cfc' }),
    ).toEqual([]);
    expect(evidenceFormatProblems({ kind: 'run', ref: 'run:2026-11-02 npm test 2584cfc' })).toEqual(
      [],
    );
    expect(evidenceFormatProblems({ kind: 'run', ref: 'run:2026-11-02 npm test' })).toHaveLength(1);
    expect(
      evidenceFormatProblems({ kind: 'run', ref: 'run:2026-13-40 npm test', note: '2584cfc' }),
    ).toHaveLength(1);
    expect(evidenceFormatProblems({ kind: 'run', ref: 'npm test', note: '2584cfc' })).toHaveLength(
      1,
    );
    expect(
      evidenceFormatProblems({ kind: 'run', ref: 'run:2026-11-02 npm test', note: 'defaced' }),
    ).toHaveLength(1);
    expect(evidenceFormatProblems({ kind: 'manual', ref: 'bitácora del equipo' })).toEqual([]);
    expect(evidenceFormatProblems({ kind: 'manual', ref: ' ' })).toHaveLength(1);
    expect(evidenceFormatProblems(CODE)).toEqual([]);
    for (const ref of ['', '/etc/x', 'C:/x.ts', 'a\\b.ts', '../x.ts', 'a/../b.ts']) {
      expect(evidenceFormatProblems({ kind: 'code', ref })).toHaveLength(1);
    }
    // Real files may have spaces and parentheses in their names.
    expect(evidenceFormatProblems({ kind: 'doc', ref: 'docs/Enunciado (1).pdf' })).toEqual([]);
  });

  it('collects the sources of diagrams and tables', () => {
    const items = collectEvidence(
      [diagram({ id: 'd1', sources: [CODE] })],
      [table({ id: 't1', sources: [CODE, MANUAL] })],
    );
    expect(items.map((item) => item.where)).toEqual(['diagram d1', 'table t1', 'table t1']);
  });

  it('requires path-like refs to exist and checks only the format of git, run and manual refs', () => {
    const items = collectEvidence(
      [
        diagram({
          id: 'd1',
          sources: [
            { kind: 'config', ref: 'compose.yaml:3-9' },
            { kind: 'code', ref: 'web/src/gone.ts:1' },
            { kind: 'git', ref: 'git:abcdef1' },
            { kind: 'run', ref: 'run:2026-11-02 npm test', note: '2584cfc' },
            MANUAL,
          ],
        }),
      ],
      [table({ id: 't1', sources: [{ kind: 'contract', ref: 'contract/missing.yaml#op' }] })],
    );
    const exists = (path: string): boolean => path === 'compose.yaml';
    expect(findEvidenceProblems(items, exists)).toEqual([
      'diagram d1: code evidence web/src/gone.ts:1 does not exist in the repository',
      'table t1: contract evidence contract/missing.yaml#op does not exist in the repository',
    ]);
  });

  it('reports a malformed ref without also reporting it missing', () => {
    const items = collectEvidence(
      [diagram({ id: 'd1', sources: [{ kind: 'code', ref: '/abs/path.ts' }] })],
      [],
    );
    expect(findEvidenceProblems(items, () => false)).toHaveLength(1);
  });
});

// Dates and staleness -----------------------------------------------------------------------------------

describe('parseIsoDate and formatSnapshotLabel', () => {
  it('reads calendar dates and nothing else', () => {
    expect(parseIsoDate('2026-11-02')).toBeTypeOf('number');
    expect(parseIsoDate('2026-02-29')).toBeUndefined();
    expect(parseIsoDate('2028-02-29')).toBeTypeOf('number');
    expect(parseIsoDate('2026-13-01')).toBeUndefined();
    expect(parseIsoDate('02/11/2026')).toBeUndefined();
    expect(parseIsoDate('2026-11-02T10:00')).toBeUndefined();
    expect(parseIsoDate('')).toBeUndefined();
  });

  it('writes the label the page shows', () => {
    expect(formatSnapshotLabel('2026-11-02')).toBe('02/11/2026');
    expect(formatSnapshotLabel('nope')).toBeUndefined();
  });
});

describe('isSnapshotStale', () => {
  it('is fresh on the same day and up to 14 days later', () => {
    expect(isSnapshotStale('2026-11-02', '2026-11-02')).toBe(false);
    expect(isSnapshotStale('2026-11-02', '2026-11-16')).toBe(false);
  });

  it('is stale from the 15th day', () => {
    expect(isSnapshotStale('2026-11-02', '2026-11-17')).toBe(true);
    expect(isSnapshotStale('2026-11-02', '2027-03-01')).toBe(true);
  });

  it('counts across month and year boundaries', () => {
    expect(isSnapshotStale('2026-12-25', '2027-01-08')).toBe(false);
    expect(isSnapshotStale('2026-12-25', '2027-01-09')).toBe(true);
    expect(isSnapshotStale('2028-02-20', '2028-03-05')).toBe(false);
    expect(isSnapshotStale('2028-02-20', '2028-03-06')).toBe(true);
  });

  it('does not call a snapshot from the future stale', () => {
    expect(isSnapshotStale('2026-11-20', '2026-11-02')).toBe(false);
  });

  it('honours a custom limit and treats an unreadable date as stale', () => {
    expect(isSnapshotStale('2026-11-02', '2026-11-05', 2)).toBe(true);
    expect(isSnapshotStale('2026-11-02', '2026-11-04', 2)).toBe(false);
    expect(isSnapshotStale('not a date', '2026-11-02')).toBe(true);
    expect(isSnapshotStale('2026-11-02', 'not a date')).toBe(true);
  });
});
