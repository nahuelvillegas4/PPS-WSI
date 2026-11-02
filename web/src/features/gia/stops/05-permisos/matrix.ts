import { CALLER_REACH, MINIMUM_RANK, OPERATIONS, type Caller } from '../../data/operations';
import type { ApiOperation } from '../../model/types';

/** What a caller gets from an operation: allowed, allowed only as the author, or an HTTP status. */
export type Outcome = 'yes' | 'own' | 401 | 403 | 404;

/**
 * The outcome for one caller, read from the fixture's columns: the minimum decides who is allowed,
 * and `nonMember` says whether a user with no role in the project sees 404 or 403. A viewer below
 * the minimum gets 403; an anonymous caller gets 401. Operations that only the author may run
 * stay "own" for every role that reaches them, the global admin included.
 */
export function outcomeFor(caller: Caller, operation: ApiOperation): Outcome {
  const rank = MINIMUM_RANK[CALLER_REACH[caller]];
  if (rank >= MINIMUM_RANK[operation.minimum]) {
    return operation.ownerOnly === true && rank >= MINIMUM_RANK.annotator ? 'own' : 'yes';
  }
  if (caller === 'anonymous') return 401;
  if (caller === 'non-member') return operation.nonMember ?? 403;
  return 403;
}

/** A row of the access matrix: every operation that asks for the same thing. */
export interface AccessGroup {
  id: string;
  label: string;
  select: (operation: ApiOperation) => boolean;
}

/**
 * Ten groups that partition the 40 operations (a test checks it). They follow the fixture:
 * `tile-access` is counted under `project.view`, and "any session" holds only the three that
 * need no project.
 */
export const ACCESS_GROUPS: readonly AccessGroup[] = [
  {
    id: 'public',
    label: 'Públicas: ingresar y estado del servicio',
    select: (operation) => operation.minimum === 'anonymous',
  },
  {
    id: 'session',
    label: 'Cualquier sesión: salir, ver la sesión y listar los proyectos visibles',
    select: (operation) => operation.minimum === 'any-authenticated',
  },
  {
    id: 'view',
    label: 'project.view: ver el proyecto, sus datasets, clases, imágenes, anotaciones y teselas',
    select: (operation) => operation.permission === 'project.view',
  },
  {
    id: 'annotate',
    label: 'annotation.write: crear una anotación',
    select: (operation) => operation.permission === 'annotation.write' && !operation.ownerOnly,
  },
  {
    id: 'own',
    label: 'annotation.write: editar o borrar una anotación, solo su autor',
    select: (operation) => operation.ownerOnly === true,
  },
  {
    id: 'upload',
    label: 'image.upload: subir imágenes desde el navegador',
    select: (operation) => operation.permission === 'image.upload',
  },
  {
    id: 'catalog',
    label: 'catalog.manage: crear, editar y borrar datasets y clases',
    select: (operation) => operation.permission === 'catalog.manage',
  },
  {
    id: 'members',
    label: 'member.manage: ver, agregar, cambiar y quitar miembros',
    select: (operation) => operation.permission === 'member.manage',
  },
  {
    id: 'export',
    label: 'dataset.export: exportar las anotaciones',
    select: (operation) => operation.permission === 'dataset.export',
  },
  {
    id: 'global',
    label:
      'Solo administrador global: usuarios, proyectos, volumen, registrar por clave e importar',
    select: (operation) => operation.minimum === 'global-admin',
  },
];

/**
 * The outcome shared by most operations of a group. One operation may differ on purpose (the
 * gateway's access check answers 403 to a non-member where the rest answer 404); a tie between
 * two outcomes is a data error, so it throws instead of picking one.
 */
export function groupOutcome(caller: Caller, operations: readonly ApiOperation[]): Outcome {
  const counts = new Map<Outcome, number>();
  for (const operation of operations) {
    const outcome = outcomeFor(caller, operation);
    counts.set(outcome, (counts.get(outcome) ?? 0) + 1);
  }
  let best: Outcome | null = null;
  let bestCount = 0;
  let tied = false;
  for (const [outcome, count] of counts) {
    if (count > bestCount) {
      best = outcome;
      bestCount = count;
      tied = false;
    } else if (count === bestCount) {
      tied = true;
    }
  }
  if (best === null || tied) {
    throw new Error('Access group without a single dominant outcome: fix ACCESS_GROUPS');
  }
  return best;
}

export interface MatrixRow {
  group: AccessGroup;
  operations: number;
  outcomes: Record<Caller, Outcome>;
}

/** The matrix rows: one per group, with the outcome of each of the six callers. */
export function matrixRows(operations: readonly ApiOperation[] = OPERATIONS): MatrixRow[] {
  return ACCESS_GROUPS.map((group) => {
    const members = operations.filter(group.select);
    const outcomeOf = (caller: Caller): Outcome => groupOutcome(caller, members);
    return {
      group,
      operations: members.length,
      outcomes: {
        anonymous: outcomeOf('anonymous'),
        'non-member': outcomeOf('non-member'),
        viewer: outcomeOf('viewer'),
        annotator: outcomeOf('annotator'),
        'project-admin': outcomeOf('project-admin'),
        'global-admin': outcomeOf('global-admin'),
      },
    };
  });
}
