import { describe, expect, it } from 'vitest';
import {
  can,
  PROJECT_ROLE_LABELS,
  type ProjectAction,
  type ProjectRole,
} from '../../../access/access';
import { GLOBAL_ROLE_LABELS } from '../../../users/globalRoleLabels';
import { CALLERS, OPERATIONS, reachByRole, type Caller } from '../../data/operations';
import { lintDiagram } from '../../engine/diagramLint';
import { FACTS } from '../../model/facts';
import type { Cell, TableDef } from '../../model/types';
import { content } from './index';
import { ACCESS_GROUPS, groupOutcome, matrixRows, outcomeFor, type Outcome } from './matrix';
import { ACTION_ORDER, AREA_ORDER, CALLER_COLUMNS, ROLE_COLUMNS } from './tables';
import { readFixture } from './fixture.testing';
import { repoPathExists } from '../../drift/repoFiles.testing';

function textOf(cell: Cell | undefined): string {
  if (typeof cell === 'string') return cell;
  throw new Error('Not a text cell');
}

function monoOf(cell: Cell | undefined): string {
  if (typeof cell === 'object' && 'mono' in cell) return cell.mono;
  throw new Error('Not a monospace cell');
}

function table(id: string): TableDef {
  const found = content.tables.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Table ${id} is not defined by the permissions stop`);
  return found;
}

function operation(id: string) {
  const found = OPERATIONS.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Operation ${id} is not in OPERATIONS`);
  return found;
}

describe('outcomeFor', () => {
  it('lets anyone call a public operation and sends an anonymous caller to 401 elsewhere', () => {
    expect(CALLERS.map((caller) => outcomeFor(caller, operation('login')))).toEqual(
      Array<Outcome>(6).fill('yes'),
    );
    expect(outcomeFor('anonymous', operation('getCurrentUser'))).toBe(401);
    expect(outcomeFor('anonymous', operation('getProject'))).toBe(401);
    expect(outcomeFor('non-member', operation('getCurrentUser'))).toBe('yes');
  });

  it('hides a project from a non-member with 404, and the tile check answers 403', () => {
    expect(outcomeFor('non-member', operation('getProject'))).toBe(404);
    expect(outcomeFor('non-member', operation('createDataset'))).toBe(404);
    expect(outcomeFor('non-member', operation('authorizeTileRequest'))).toBe(403);
  });

  it('answers 403 to a role below the minimum, up to the global admin who passes everything', () => {
    expect(outcomeFor('viewer', operation('createAnnotation'))).toBe(403);
    expect(outcomeFor('annotator', operation('createDataset'))).toBe(403);
    expect(outcomeFor('project-admin', operation('createUser'))).toBe(403);
    expect(outcomeFor('project-admin', operation('importAnnotations'))).toBe(403);
    expect(outcomeFor('global-admin', operation('importAnnotations'))).toBe('yes');
    expect(outcomeFor('non-member', operation('importAnnotations'))).toBe(403);
  });

  it('keeps editing an annotation to its author, whatever the role, the global admin included', () => {
    expect(outcomeFor('viewer', operation('updateAnnotation'))).toBe(403);
    expect(outcomeFor('annotator', operation('updateAnnotation'))).toBe('own');
    expect(outcomeFor('project-admin', operation('deleteAnnotation'))).toBe('own');
    expect(outcomeFor('global-admin', operation('deleteAnnotation'))).toBe('own');
    expect(outcomeFor('annotator', operation('createAnnotation'))).toBe('yes');
  });
});

describe('groupOutcome', () => {
  it('takes the outcome most operations of the group share', () => {
    const view = OPERATIONS.filter((candidate) => candidate.permission === 'project.view');
    expect(groupOutcome('non-member', view)).toBe(404);
  });

  it('refuses a group that has no dominant outcome', () => {
    const mixed = [operation('getProject'), operation('authorizeTileRequest')];
    expect(() => groupOutcome('non-member', mixed)).toThrow(/dominant/);
    expect(() => groupOutcome('viewer', [])).toThrow(/dominant/);
  });
});

describe('the access matrix', () => {
  it('splits the operations into ten groups of 3, 3, 9, 1, 2, 1, 6, 4, 1 and 10, each one in one group', () => {
    const rows = matrixRows();
    expect(rows.map((row) => row.operations)).toEqual([3, 3, 9, 1, 2, 1, 6, 4, 1, 10]);
    expect(rows.reduce((sum, row) => sum + row.operations, 0)).toBe(FACTS.operations);
    for (const candidate of OPERATIONS) {
      const groups = ACCESS_GROUPS.filter((group) => group.select(candidate));
      expect(groups, candidate.id).toHaveLength(1);
    }
  });

  it('shows each caller the outcome of the access rules (map-api section 3.4)', () => {
    const yes: Outcome = 'yes';
    const own: Outcome = 'own';
    // anonymous, non-member, viewer, annotator, project-admin, global-admin
    const expected: Record<string, readonly Outcome[]> = {
      public: [yes, yes, yes, yes, yes, yes],
      session: [401, yes, yes, yes, yes, yes],
      view: [401, 404, yes, yes, yes, yes],
      annotate: [401, 404, 403, yes, yes, yes],
      own: [401, 404, 403, own, own, own],
      upload: [401, 404, 403, 403, yes, yes],
      catalog: [401, 404, 403, 403, yes, yes],
      members: [401, 404, 403, 403, yes, yes],
      export: [401, 404, 403, 403, yes, yes],
      global: [401, 403, 403, 403, 403, yes],
    };
    for (const row of matrixRows()) {
      expect(
        CALLERS.map((caller) => row.outcomes[caller]),
        row.group.id,
      ).toEqual(expected[row.group.id]);
    }
  });

  it('builds the table with one row per group and the cumulative reach as its footer', () => {
    const matrix = table('matriz-permisos');
    expect(matrix.rows).toHaveLength(ACCESS_GROUPS.length);
    expect(matrix.columns.map((column) => column.key)).toEqual([
      'requisito',
      ...CALLERS.map((caller) => CALLER_COLUMNS[caller].key),
    ]);
    const reach = reachByRole();
    CALLERS.forEach((caller: Caller, index) => {
      expect(matrix.footer?.[CALLER_COLUMNS[caller].key]).toBe([3, 6, 15, 18, 30, 40][index]);
      expect(matrix.footer?.[CALLER_COLUMNS[caller].key]).toBe(reach[caller]);
    });
    const counts = matrix.rows.map((row) => /\((\d+)\)$/.exec(textOf(row['requisito']))?.[1]);
    expect(counts.map(Number).reduce((sum, count) => sum + count, 0)).toBe(FACTS.operations);
  });

  it('shows allowed, author-only and denied cells with the cell kinds the table renders', () => {
    const matrix = table('matriz-permisos');
    const view = matrix.rows.find((row) => textOf(row['requisito']).startsWith('project.view'));
    expect(view?.['anonimo']).toEqual({ mono: '401' });
    expect(view?.['sinMembresia']).toEqual({ mono: '404' });
    expect(view?.['lector']).toEqual({ yes: true });
    const own = matrix.rows.find((row) => textOf(row['requisito']).includes('solo su autor'));
    expect(own?.['anotador']).toEqual({ yes: 'own' });
    expect(own?.['lector']).toEqual({ mono: '403' });
  });
});

describe('the roles table', () => {
  it('lists the two global and the three project roles of the fixture, with the interface labels', async () => {
    const fixture = await readFixture();
    const roles = table('roles');
    const codes = roles.rows.map((row) => monoOf(row['rol']));
    expect(codes).toEqual([...fixture.roles.global, ...fixture.roles.project]);
    const labels = roles.rows.map((row) => row['etiqueta']);
    expect(labels).toEqual([
      GLOBAL_ROLE_LABELS.admin,
      GLOBAL_ROLE_LABELS.user,
      PROJECT_ROLE_LABELS.viewer,
      PROJECT_ROLE_LABELS.annotator,
      PROJECT_ROLE_LABELS['project-admin'],
    ]);
    expect(roles.rows.map((row) => row['nivel'])).toEqual([
      'Global',
      'Global',
      'Proyecto',
      'Proyecto',
      'Proyecto',
    ]);
  });
});

describe('what the interface shows each role', () => {
  function yesOf(cell: Cell | undefined): boolean | string {
    if (typeof cell === 'object' && 'yes' in cell) return cell.yes;
    throw new Error('Not a yes/no cell');
  }

  it('calls can() for the six project actions and the five sessions', () => {
    const visibility = table('que-ve-cada-rol');
    expect(visibility.rows).toHaveLength(ACTION_ORDER.length);
    expect(ACTION_ORDER).toHaveLength(6);
    visibility.rows.forEach((row, index) => {
      const action = ACTION_ORDER[index];
      if (action === undefined) throw new Error('Missing action');
      for (const column of ROLE_COLUMNS) {
        expect(yesOf(row[column.key]), `${action} / ${column.label}`).toBe(
          can(action, column.context),
        );
      }
    });
  });

  it('shows the ladder: lector sees, anotador annotates, administrador changes the catalog', () => {
    const visibility = table('que-ve-cada-rol');
    const grid = visibility.rows.map((row) => ROLE_COLUMNS.map((c) => yesOf(row[c.key])));
    // sin membresía, lector, anotador, admin del proyecto, admin global
    expect(grid).toEqual([
      [false, true, true, true, true], // viewProject
      [false, false, true, true, true], // annotate
      [false, false, false, true, true], // manageCatalog
      [false, false, false, true, true], // uploadImages
      [false, false, false, true, true], // manageMembers
      [false, false, false, true, true], // exportDataset
    ]);
  });

  it('agrees with the permissions of the fixture, so the interface cannot drift from the matrix', async () => {
    const fixture = await readFixture();
    const permissionOf: Record<ProjectAction, string> = {
      viewProject: 'project.view',
      annotate: 'annotation.write',
      manageCatalog: 'catalog.manage',
      uploadImages: 'image.upload',
      manageMembers: 'member.manage',
      exportDataset: 'dataset.export',
    };
    const ladder: readonly ProjectRole[] = ['viewer', 'annotator', 'project-admin'];
    expect(fixture.roles.project).toEqual(ladder);
    for (const action of ACTION_ORDER) {
      const minimum = fixture.permissions[permissionOf[action]];
      if (minimum === undefined) throw new Error(`No permission for ${action}`);
      for (const role of ladder) {
        expect(can(action, { globalRole: 'user', projectRole: role }), `${action} / ${role}`).toBe(
          ladder.indexOf(role) >= ladder.findIndex((candidate) => candidate === minimum),
        );
      }
    }
    expect(Object.keys(fixture.permissions)).toHaveLength(ACTION_ORDER.length);
  });

  it('says in its footer that it only hides', () => {
    const footer = table('que-ve-cada-rol').footer;
    expect(textOf(footer?.['accion'])).toMatch(/solo oculta/i);
  });
});

describe('the API in numbers', () => {
  it('counts operations, those with a screen and the ones that owe something, by area', () => {
    const areas = table('api-areas');
    expect(areas.rows).toHaveLength(AREA_ORDER.length);
    expect(areas.rows.map((row) => row['operaciones'])).toEqual([3, 4, 5, 4, 5, 4, 5, 5, 2, 1, 2]);
    expect(areas.rows.map((row) => row['pantalla'])).toEqual([
      '3 de 3',
      '2 de 4',
      '3 de 5',
      '4 de 4',
      '2 de 5',
      '0 de 4',
      '4 de 5',
      '0 de 5',
      '0 de 2',
      '0 de 1',
      '0 de 2',
    ]);
    expect(areas.footer?.['operaciones']).toBe(FACTS.operations);
    expect(areas.footer?.['pantalla']).toBe(
      `${String(FACTS.inSpa)} de ${String(FACTS.operations)}`,
    );
  });

  it('lists the lowest caller each area accepts, in ladder order', () => {
    const areas = table('api-areas');
    const byArea = new Map(areas.rows.map((row) => [row['area'], row['minimo']]));
    expect(byArea.get('Sesión: ingresar, salir y ver la sesión')).toBe(
      'Sin sesión · Cualquier sesión',
    );
    expect(byArea.get('Usuarios')).toBe('Administrador global');
    expect(byArea.get('Proyectos')).toBe('Cualquier sesión · Lector · Administrador global');
  });

  it('marks the areas with something pending and leaves the others with a dash', () => {
    const areas = table('api-areas');
    const pending = areas.rows.map((row) => row['pendiente']);
    expect(pending[5]).toBe('—');
    expect(pending[7]).toBe('—');
    expect(pending[0]).toEqual({ chips: [{ label: '1 planificado', status: 'planned' }] });
    expect(pending[8]).toEqual({
      chips: [
        { label: '1 planificado', status: 'planned' },
        { label: '1 parcial', status: 'partial' },
      ],
    });
  });
});

describe('the section', () => {
  it('declares the four tabs, the ids it owns and the two footnotes verbatim', () => {
    const { section } = content;
    expect(section.id).toBe('permisos');
    expect(section.group).toBe('recorrido');
    expect(section.tabs.map((tab) => tab.id)).toEqual(['matriz', 'roles', 'interfaz', 'api']);
    expect(content.tables.map((candidate) => candidate.id)).toEqual([
      'matriz-permisos',
      'roles',
      'que-ve-cada-rol',
      'api-areas',
    ]);
    expect(content.diagrams.map((diagram) => diagram.id)).toEqual(['roles', 'decision-acceso']);
    expect(section.footnotes?.map((note) => note.text)).toEqual([
      'El rol global viaja en la cookie desde el ingreso (8 h deslizantes) y no se revalida; /auth/me lee el rol actual de la base. Tras un PATCH /users la interfaz y la API pueden discrepar hasta reingresar. Los roles de proyecto no se ven afectados. PLANIFICADO: SessionValidator (ADR-16).',
      'tile-access: un no miembro recibe 403, no 404, porque auth_request de Nginx solo acepta 2xx, 401 y 403.',
    ]);
  });

  it('keeps its headline short and gives the speaker 2 to 4 notes, the first one to say aloud', () => {
    const { section } = content;
    expect(section.headline.length).toBeLessThanOrEqual(90);
    expect(section.notes.length).toBeGreaterThanOrEqual(2);
    expect(section.notes.length).toBeLessThanOrEqual(4);
    expect(section.notes[0]).toBe('El servidor decide; la interfaz solo oculta.');
  });

  it('references every table and diagram it defines, and nothing else', () => {
    const referenced = content.section.tabs.flatMap((tab) => tab.blocks);
    const tables = referenced.flatMap((block) => (block.kind === 'table' ? [block.id] : []));
    const diagrams = referenced.flatMap((block) => (block.kind === 'diagram' ? [block.id] : []));
    expect(tables.sort()).toEqual(content.tables.map((candidate) => candidate.id).sort());
    expect(diagrams.sort()).toEqual(content.diagrams.map((diagram) => diagram.id).sort());
  });
});

describe('the diagrams', () => {
  it('pass the static lint of the engine', () => {
    for (const diagram of content.diagrams) {
      expect(
        lintDiagram(diagram).map((issue) => issue.message),
        diagram.id,
      ).toEqual([]);
    }
  });

  it('draws the decision with at most 14 nodes and the outcomes the API gives', () => {
    const decision = content.diagrams.find((diagram) => diagram.id === 'decision-acceso');
    const source = decision?.source ?? '';
    const nodes = new Set(
      [...source.matchAll(/^ {2}([A-Za-z0-9]+)[[{]/gm)].map((match) => match[1]),
    );
    expect(nodes.size).toBeGreaterThan(0);
    expect(nodes.size).toBeLessThanOrEqual(14);
    for (const word of [
      '401',
      '403',
      '404',
      'no revela que existe',
      'administrador global',
      'miembro',
    ]) {
      expect(source, word).toContain(word);
    }
    // the global-admin shortcut skips membership but not the author check
    expect(source).toMatch(/Q3 -- "sí[^"]*" --> Q6/);
  });

  it('marks the session validator as planned from the feature registry, dashed into the first test', () => {
    const decision = content.diagrams.find((diagram) => diagram.id === 'decision-acceso');
    expect(decision?.source).toMatch(
      /SV\["○ Validador de sesión<br\/>PLANIFICADO, ADR-16"\]:::planned/,
    );
    expect(decision?.source).toContain('SV -.-> Q1');
    expect(decision?.usesStatus).toBe(true);
  });

  it('names the three roles and the reserved actions of the ladder', () => {
    const roles = content.diagrams.find((diagram) => diagram.id === 'roles');
    for (const label of [
      PROJECT_ROLE_LABELS.viewer,
      PROJECT_ROLE_LABELS.annotator,
      PROJECT_ROLE_LABELS['project-admin'],
      GLOBAL_ROLE_LABELS.admin,
    ]) {
      expect(roles?.source, label).toContain(label);
    }
    expect(roles?.source).toContain('usuarios · proyectos · volumen');
  });
});

describe('evidence', () => {
  it('points at files that exist', () => {
    const missing: string[] = [];
    const sources = [...content.tables, ...content.diagrams].flatMap((item) => item.sources);
    for (const evidence of sources) {
      const path = evidence.ref.replace(/#.*$/, '').replace(/:\d+(?:-\d+)?$/, '');
      if (!repoPathExists(path)) missing.push(path);
    }
    expect(missing).toEqual([]);
  });
});
