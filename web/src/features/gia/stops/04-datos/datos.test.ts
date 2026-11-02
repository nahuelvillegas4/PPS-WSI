import { describe, expect, it } from 'vitest';
import {
  allRepoPaths,
  findRepoText,
  readRepoFile,
  repoPathExists,
} from '../../drift/repoFiles.testing';
import { lintDiagram } from '../../engine/diagramLint';
import { FACTS } from '../../model/facts';
import type { DiagramDef, TableDef } from '../../model/types';
import { content } from './index';
import { IMPLEMENTED_TABLES, INTEGRITY_RULES, MIGRATIONS, NO_TEST, PLANNED_TABLES } from './tables';

const SNAPSHOT_PATH =
  'api/src/Pps.Infrastructure/Persistence/Migrations/AppDbContextModelSnapshot.cs';
const MIGRATIONS_DIR = 'api/src/Pps.Infrastructure/Persistence/Migrations/';

function table(id: string): TableDef {
  const found = content.tables.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Table ${id} is not defined by the data stop`);
  return found;
}

function diagram(id: string): DiagramDef {
  const found = content.diagrams.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Diagram ${id} is not defined by the data stop`);
  return found;
}

async function snapshot(): Promise<string> {
  return readRepoFile(SNAPSHOT_PATH);
}

/** Entity names of an ER source, in the order it declares them: `NAME {` or `NAME["alias"]:::cls {`. */
function entitiesOf(source: string): string[] {
  return [...source.matchAll(/^ {2}([A-Z_]+)(?:\["[^"]*"\])?(?::::[a-z]+)? \{$/gm)].map(
    (match) => match[1] ?? '',
  );
}

/** Attribute lines of each entity block. */
function attributeCounts(source: string): Map<string, number> {
  const counts = new Map<string, number>();
  let current: string | null = null;
  for (const line of source.split('\n')) {
    const open = /^ {2}([A-Z_]+)(?:\["[^"]*"\])?(?::::[a-z]+)? \{$/.exec(line);
    if (open) {
      current = open[1] ?? null;
      if (current !== null) counts.set(current, 0);
    } else if (/^ {2}\}$/.test(line)) {
      current = null;
    } else if (current !== null && line.trim() !== '') {
      counts.set(current, (counts.get(current) ?? 0) + 1);
    }
  }
  return counts;
}

/** `PARENT -> CHILD` of a relationship line. */
function edgeOf(line: string): string {
  const match = /^ {2}([A-Z_]+) \S+ ([A-Z_]+) : /.exec(line);
  return `${match?.[1] ?? '?'} -> ${match?.[2] ?? '?'}`;
}

/** Relationship lines of an ER source: `A ||--o{ B : "label"`. */
function relationshipsOf(source: string): string[] {
  return source.split('\n').filter((line) => /^ {2}[A-Z_]+ \S+--\S+ [A-Z_]+ : "/.test(line));
}

describe('the tables against the model snapshot', () => {
  it('lists the tables the snapshot maps, 8 of them', async () => {
    const mapped = [...(await snapshot()).matchAll(/\.ToTable\("([a-z_]+)"/g)].map(
      (match) => match[1] ?? '',
    );
    expect(mapped).toHaveLength(FACTS.tables);
    expect([...mapped].sort()).toEqual(IMPLEMENTED_TABLES.map((data) => data.name).sort());
  });

  it('shows the implemented tables as done and the extensions as planned in the table', () => {
    const rows = table('tablas').rows;
    expect(rows).toHaveLength(IMPLEMENTED_TABLES.length + PLANNED_TABLES.length);
    expect(rows.map((row) => row['estado'])).toEqual([
      ...IMPLEMENTED_TABLES.map(() => ({ status: 'done' })),
      ...PLANNED_TABLES.map(() => ({ status: 'planned' })),
    ]);
  });

  it('keeps the planned tables and columns out of the code: the tripwire for the extensions', async () => {
    expect(
      await findRepoText({
        in: ['api/src/**'],
        pattern:
          'annotation_revisions|AnnotationRevision|image_review_state|ImageReviewState|session_version|SessionVersion|dicom',
      }),
      'Se construyó algo que la guía marca como planificado en la parada de datos: actualizá stops/04-datos y el modelo objetivo',
    ).toEqual([]);
  });
});

describe('the implemented ER diagram', () => {
  it('draws the same eight entities as the snapshot, each with at most 7 attributes', () => {
    const source = diagram('er-implementado').source;
    const entities = entitiesOf(source).map((name) => name.toLowerCase());
    expect([...entities].sort()).toEqual(IMPLEMENTED_TABLES.map((data) => data.name).sort());
    for (const [name, count] of attributeCounts(source)) {
      expect(count, name).toBeLessThanOrEqual(7);
      expect(count, name).toBeGreaterThan(0);
    }
  });

  it('draws one relationship per foreign key and labels each with its delete rule', async () => {
    const text = await snapshot();
    const relationships = relationshipsOf(diagram('er-implementado').source);
    const foreignKeys = text.match(/\.HasForeignKey\(/g) ?? [];
    expect(relationships).toHaveLength(foreignKeys.length);
    const cascades = relationships.filter((line) => line.endsWith('CASCADE"'));
    const restricts = relationships.filter((line) => line.endsWith('RESTRICT"'));
    expect(cascades).toHaveLength((text.match(/DeleteBehavior\.Cascade/g) ?? []).length);
    expect(restricts).toHaveLength((text.match(/DeleteBehavior\.Restrict/g) ?? []).length);
    expect(cascades.length + restricts.length).toBe(relationships.length);
  });

  it('has CASCADE only from projects to project_members and from datasets to annotations', () => {
    const cascades = relationshipsOf(diagram('er-implementado').source).filter((line) =>
      line.endsWith('CASCADE"'),
    );
    expect(cascades.map(edgeOf)).toEqual([
      'PROJECTS -> PROJECT_MEMBERS',
      'DATASETS -> ANNOTATIONS',
    ]);
  });
});

describe('the target ER diagram', () => {
  it('keeps the eight entities and adds the two planned ones, painted as planned', () => {
    const source = diagram('er-objetivo').source;
    expect(entitiesOf(source).sort()).toEqual(
      [
        ...IMPLEMENTED_TABLES.map((data) => data.name.toUpperCase()),
        ...PLANNED_TABLES.map((data) => data.name.toUpperCase()),
      ].sort(),
    );
    expect(source.match(/:::planned/g)).toHaveLength(PLANNED_TABLES.length);
    expect(source).toContain('PLANIFICADO');
    expect(source).toContain('SIN DECIDIR');
    expect(diagram('er-objetivo').usesStatus).toBe(true);
  });

  it('marks the planned column and values with the status word and glyph', () => {
    const source = diagram('er-objetivo').source;
    expect(source).toMatch(/int session_version "○ PLANIFICADO/);
    expect(source).toMatch(/varchar format "○ dicom: PLANIFICADO"/);
    expect(source).toMatch(/varchar source "○ model: PLANIFICADO"/);
  });
});

describe('integrity: what the page says the database imposes', () => {
  it('has the two composite foreign keys that tie a class and an image to the same dataset', async () => {
    const text = await snapshot();
    expect(text).toContain('.HasForeignKey("DatasetId", "ClassId")');
    expect(text).toContain('.HasForeignKey("DatasetId", "ImageId")');
    expect(text.match(/\.HasAlternateKey\("DatasetId", "Id"\)/g)).toHaveLength(2);
    const callout = content.section.tabs
      .flatMap((tab) => tab.blocks)
      .find((block) => block.kind === 'callout' && block.text.includes('images(dataset_id, id)'));
    expect(callout && 'text' in callout && callout.text).toContain('label_classes(dataset_id, id)');
  });

  it('has the two role CHECK constraints, a composite key for members and three unique indexes', async () => {
    const text = await snapshot();
    expect(text).toContain('"ck_users_role", "role IN (\'admin\', \'user\')"');
    expect(text).toContain(
      "\"ck_project_members_role\", \"role IN ('viewer', 'annotator', 'project-admin')\"",
    );
    expect(text).toContain('.HasKey("ProjectId", "UserId")');
    expect(text.match(/\.IsUnique\(\)/g)).toHaveLength(3);
    expect(text).toContain('ix_users_username');
    expect(text).toContain('ix_projects_name');
    expect(text).toContain('ix_images_dataset_id_storage_key');
  });

  it('has no unique index on dataset names per project or class names per dataset', async () => {
    const text = await snapshot();
    expect(text).not.toMatch(/HasIndex\("ProjectId", "Name"\)/);
    expect(text).not.toMatch(/HasIndex\("DatasetId", "Name"\)/);
  });

  it('says "no automatic test" only for rules whose 409 slug no API test mentions', async () => {
    const withoutTest = INTEGRITY_RULES.filter((rule) => rule.test === NO_TEST);
    expect(withoutTest).toHaveLength(3);
    expect(
      await findRepoText({
        in: ['api/tests/**'],
        pattern: 'not-empty|class-in-use|duplicate-name',
      }),
      'Ya hay una prueba para una regla que la guía dice sin prueba: actualizá INTEGRITY_RULES en stops/04-datos/tables.ts',
    ).toEqual([]);
  });

  it('cites test classes that exist', () => {
    const cited = INTEGRITY_RULES.flatMap((rule) => rule.test.match(/\b[A-Za-z]+Tests\b/g) ?? []);
    expect(cited.length).toBeGreaterThan(0);
    for (const name of cited) {
      expect(repoPathExists(`api/tests/Pps.Domain.Tests/${name}.cs`), name).toBe(true);
    }
  });
});

describe('the migrations', () => {
  const files = allRepoPaths()
    .filter((path) => path.startsWith(MIGRATIONS_DIR))
    .map((path) => path.slice(MIGRATIONS_DIR.length))
    .filter((name) => /^2\d+_\w+\.cs$/.test(name))
    .sort();

  it('are the 4 migration files, without the .Designer.cs companions', () => {
    expect(files).toHaveLength(FACTS.migrations);
    expect(files.map((name) => name.replace(/\.cs$/, ''))).toEqual(
      MIGRATIONS.map((data) => data.name),
    );
  });

  it('take their date from the name of the file', () => {
    for (const data of MIGRATIONS) {
      const [, year, month, day] = /^(\d{4})(\d{2})(\d{2})/.exec(data.name) ?? [];
      expect(data.date, data.name).toBe(`${day ?? ''}/${month ?? ''}/${year ?? ''}`);
    }
    expect(table('migraciones').rows.map((row) => row['fecha'])).toEqual(
      MIGRATIONS.map((data) => data.date),
    );
  });

  it('all have a Down, and the last one converts roles, fills no memberships and drops its table', async () => {
    for (const data of MIGRATIONS) {
      const source = await readRepoFile(`${MIGRATIONS_DIR}${data.name}.cs`);
      expect(source, data.name).toContain('protected override void Down(');
    }
    const last = MIGRATIONS[MIGRATIONS.length - 1];
    const source = await readRepoFile(`${MIGRATIONS_DIR}${last?.name ?? ''}.cs`);
    expect(source).toContain("UPDATE users SET role = 'user' WHERE role <> 'admin'");
    expect(source).not.toMatch(/INSERT\s+INTO\s+project_members/i);
    expect(source).toContain('DropTable(');
  });
});

describe('the section', () => {
  it('states the pinned counts: headline in words, notes from FACTS', () => {
    const words: Record<number, string> = { 8: 'Ocho' };
    expect(
      content.section.headline.startsWith(`${words[FACTS.tables] ?? '?'} tablas`),
      'La cantidad de tablas cambió: actualizá el titular de la parada de datos',
    ).toBe(true);
    expect(content.section.notes[1]).toContain(`${String(FACTS.tables)} tablas`);
    expect(content.section.notes[1]).toContain(`${String(FACTS.migrations)} migraciones`);
    expect(content.section.headline.length).toBeLessThanOrEqual(90);
    expect(content.section.notes.length).toBeGreaterThanOrEqual(2);
    expect(content.section.notes.length).toBeLessThanOrEqual(4);
    expect(content.section.notes[0]).toBe('El modelo del ADR-07 ya está migrado entero.');
  });

  it('shows the model in two tabs and keeps the detail tables out of the presentation', () => {
    expect(content.section.tabs.map((tab) => tab.id)).toEqual(['implementado', 'objetivo']);
    expect(content.section.tabs[0]?.blocks[0]).toEqual({ kind: 'diagram', id: 'er-implementado' });
    expect(content.section.detail).toEqual([
      { kind: 'table', id: 'integridad' },
      { kind: 'table', id: 'migraciones' },
    ]);
    expect(content.tables.map((candidate) => candidate.id)).toEqual([
      'tablas',
      'integridad',
      'migraciones',
    ]);
    expect(content.diagrams.map((candidate) => candidate.id)).toEqual([
      'er-implementado',
      'er-objetivo',
    ]);
  });

  it('references each table and diagram it defines', () => {
    const blocks = [
      ...content.section.tabs.flatMap((tab) => tab.blocks),
      ...(content.section.detail ?? []),
    ];
    const tableIds = blocks.flatMap((block) => (block.kind === 'table' ? [block.id] : []));
    const diagramIds = blocks.flatMap((block) => (block.kind === 'diagram' ? [block.id] : []));
    expect(tableIds.sort()).toEqual(content.tables.map((candidate) => candidate.id).sort());
    expect(diagramIds.sort()).toEqual(content.diagrams.map((candidate) => candidate.id).sort());
  });
});

describe('lint and evidence', () => {
  it('passes the static lint of the engine for both diagrams', () => {
    for (const candidate of content.diagrams) {
      expect(
        lintDiagram(candidate).map((issue) => issue.message),
        candidate.id,
      ).toEqual([]);
    }
  });

  it('cites files that exist', () => {
    const missing: string[] = [];
    for (const item of [...content.tables, ...content.diagrams]) {
      for (const evidence of item.sources) {
        const path = evidence.ref.replace(/#.*$/, '').replace(/:\d+(?:-\d+)?$/, '');
        if (!repoPathExists(path)) missing.push(path);
      }
    }
    expect(missing).toEqual([]);
  });
});
