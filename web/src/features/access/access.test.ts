import { describe, expect, it } from 'vitest';
import matrix from '../../../../contract/fixtures/authorization-matrix.json';
import {
  type AccessContext,
  can,
  PROJECT_ROLE_LABELS,
  type ProjectAction,
  type ProjectRole,
} from './access';

const ACTIONS: ProjectAction[] = [
  'viewProject',
  'annotate',
  'manageCatalog',
  'uploadImages',
  'manageMembers',
  'exportDataset',
];

// Wire name of each action in the authorization matrix of the contract.
const PERMISSION_OF: Record<ProjectAction, string> = {
  viewProject: 'project.view',
  annotate: 'annotation.write',
  manageCatalog: 'catalog.manage',
  uploadImages: 'image.upload',
  manageMembers: 'member.manage',
  exportDataset: 'dataset.export',
};

// Expected result per project role, in the order of ACTIONS.
const EXPECTED_BY_PROJECT_ROLE: [ProjectRole | null, boolean[]][] = [
  ['project-admin', [true, true, true, true, true, true]],
  ['annotator', [true, true, false, false, false, false]],
  ['viewer', [true, false, false, false, false, false]],
  [null, [false, false, false, false, false, false]],
];

describe('can', () => {
  describe.each(EXPECTED_BY_PROJECT_ROLE)(
    'a regular user with project role %s',
    (role, expected) => {
      it.each(ACTIONS.map((action, index) => [action, expected[index]] as const))(
        '%s -> %s',
        (action, allowed) => {
          const ctx: AccessContext = { globalRole: 'user', projectRole: role };
          expect(can(action, ctx)).toBe(allowed);
        },
      );
    },
  );

  describe.each([['project-admin'], ['annotator'], ['viewer'], [null]] as const)(
    'the global admin with project role %s',
    (role) => {
      it.each(ACTIONS)('%s -> true', (action) => {
        expect(can(action, { globalRole: 'admin', projectRole: role })).toBe(true);
      });
    },
  );
});

describe('authorization matrix of the contract', () => {
  it('lists the same permissions as the UI actions', () => {
    expect(Object.keys(matrix.permissions).sort()).toEqual(Object.values(PERMISSION_OF).sort());
  });

  it.each(ACTIONS)('%s needs the minimum role the contract states', (action) => {
    const permissions: Record<string, string> = matrix.permissions;
    const minimum = permissions[PERMISSION_OF[action]];

    // The minimum role allows the action; the role right below it does not.
    const ladder = matrix.roles.project;
    const minimumIndex = ladder.indexOf(minimum ?? '');
    expect(minimumIndex).toBeGreaterThanOrEqual(0);

    const allowedRole = ladder[minimumIndex] as ProjectRole;
    expect(can(action, { globalRole: 'user', projectRole: allowedRole })).toBe(true);

    const below = ladder[minimumIndex - 1] as ProjectRole | undefined;
    if (below) {
      expect(can(action, { globalRole: 'user', projectRole: below })).toBe(false);
    }
  });
});

describe('PROJECT_ROLE_LABELS', () => {
  it('labels every project role of the contract', () => {
    expect(Object.keys(PROJECT_ROLE_LABELS).sort()).toEqual([...matrix.roles.project].sort());
    expect(PROJECT_ROLE_LABELS).toEqual({
      'project-admin': 'Administrador del proyecto',
      annotator: 'Anotador',
      viewer: 'Lector',
    });
  });
});
