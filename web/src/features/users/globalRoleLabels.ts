import type { GlobalRole } from '../access/access';

/** Labels of the global roles, as the users screen shows them. */
export const GLOBAL_ROLE_LABELS: Record<GlobalRole, string> = {
  admin: 'Administrador global',
  user: 'Usuario',
};
