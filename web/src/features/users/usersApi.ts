import { apiFetch } from '../../shared/api';
import type { GlobalRole } from '../access/access';

/** Limits of `CreateUserRequest` (contract/openapi/api.v1.yaml). */
export const USERNAME_PATTERN = /^[a-z0-9._-]{3,64}$/;
export const USERNAME_MAX_LENGTH = 64;
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 256;

/** Global roles in the order the create form offers them (least privileged first). */
export const GLOBAL_ROLES: readonly GlobalRole[] = ['user', 'admin'];

/** `User` of the contract: an account as the global admin sees it. */
export interface User {
  id: number;
  username: string;
  role: GlobalRole;
  isActive: boolean;
  createdAt: string;
}

/** `CreateUserRequest` of the contract. */
export interface NewUser {
  username: string;
  password: string;
  role: GlobalRole;
}

interface ListResponse<T> {
  items: T[];
}

/** `GET /api/v1/users`: every account (global admin only). */
export async function fetchUsers(signal?: AbortSignal): Promise<User[]> {
  const response = await apiFetch('/api/v1/users', signal ? { signal } : {});
  const data = (await response.json()) as ListResponse<User>;
  return data.items;
}

/** `POST /api/v1/users`: creates an account with a password (global admin only). */
export async function createUser(input: NewUser): Promise<User> {
  const response = await apiFetch('/api/v1/users', {
    method: 'POST',
    body: { username: input.username, password: input.password, role: input.role },
  });
  return (await response.json()) as User;
}
