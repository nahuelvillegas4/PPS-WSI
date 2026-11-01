/**
 * What the signed-in user may do, as the UI needs it to show or hide controls.
 *
 * This only hides: the API enforces every permission (contract/fixtures/authorization-matrix.json).
 * Project actions are a ladder, `viewer` < `annotator` < `project-admin`, and the global admin
 * acts as `project-admin` in every project. Actions reserved to the global admin (users, create
 * project, browse the server volume) are not project actions: callers check `globalRole` for them.
 */

/** `GlobalRole` of the contract. */
export type GlobalRole = 'admin' | 'user';

/** `ProjectRole` of the contract. */
export type ProjectRole = 'project-admin' | 'annotator' | 'viewer';

/** Project actions; each maps to a permission of the authorization matrix. */
export type ProjectAction =
  'viewProject' | 'annotate' | 'manageCatalog' | 'uploadImages' | 'manageMembers' | 'exportDataset';

export interface AccessContext {
  globalRole: GlobalRole;
  /** Role of the user in the project at hand; `null` when there is none (or no project). */
  projectRole: ProjectRole | null;
}

/** Position of each role in the ladder; a higher rank includes everything below it. */
const ROLE_RANK: Record<ProjectRole, number> = {
  viewer: 1,
  annotator: 2,
  'project-admin': 3,
};

/** Lowest project role that may run each action. */
const MINIMUM_ROLE: Record<ProjectAction, ProjectRole> = {
  viewProject: 'viewer',
  annotate: 'annotator',
  manageCatalog: 'project-admin',
  uploadImages: 'project-admin',
  manageMembers: 'project-admin',
  exportDataset: 'project-admin',
};

/** Labels shown to the user for each project role. */
export const PROJECT_ROLE_LABELS: Record<ProjectRole, string> = {
  'project-admin': 'Administrador del proyecto',
  annotator: 'Anotador',
  viewer: 'Lector',
};

export function can(action: ProjectAction, ctx: AccessContext): boolean {
  if (ctx.globalRole === 'admin') return true;
  if (ctx.projectRole === null) return false;
  return ROLE_RANK[ctx.projectRole] >= ROLE_RANK[MINIMUM_ROLE[action]];
}
