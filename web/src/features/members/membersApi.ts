import { apiFetch } from '../../shared/api';
import type { ProjectRole } from '../access/access';

/** Limits of `AddProjectMemberRequest` (contract/openapi/api.v1.yaml). */
export const MEMBER_USERNAME_PATTERN = /^[a-z0-9._-]{3,64}$/;
export const MEMBER_USERNAME_MAX_LENGTH = 64;

/** Project roles in the order of the ladder (least privileged first). */
export const PROJECT_ROLES: readonly ProjectRole[] = ['viewer', 'annotator', 'project-admin'];

/** `ProjectMember` of the contract. */
export interface Member {
  userId: number;
  username: string;
  role: ProjectRole;
  isActive: boolean;
  createdAt: string;
}

/** The part of `Project` this screen shows: the name in the header. */
export interface ProjectSummary {
  id: number;
  name: string;
}

/** `AddProjectMemberRequest` of the contract. */
export interface NewMember {
  username: string;
  role: ProjectRole;
}

interface ListResponse<T> {
  items: T[];
}

function membersPath(projectId: number): string {
  return `/api/v1/projects/${projectId}/members`;
}

/** `GET /api/v1/projects/{projectId}`: needs membership (404 otherwise), carries the name. */
export async function fetchProjectSummary(
  projectId: number,
  signal?: AbortSignal,
): Promise<ProjectSummary> {
  const response = await apiFetch(`/api/v1/projects/${projectId}`, signal ? { signal } : {});
  return (await response.json()) as ProjectSummary;
}

/** `GET /api/v1/projects/{projectId}/members`: needs `project-admin` (403 for lower roles). */
export async function fetchMembers(projectId: number, signal?: AbortSignal): Promise<Member[]> {
  const response = await apiFetch(membersPath(projectId), signal ? { signal } : {});
  const data = (await response.json()) as ListResponse<Member>;
  return data.items;
}

/** `POST /api/v1/projects/{projectId}/members`: assigns an existing user, by exact username. */
export async function addMember(projectId: number, input: NewMember): Promise<Member> {
  const response = await apiFetch(membersPath(projectId), {
    method: 'POST',
    body: { username: input.username, role: input.role },
  });
  return (await response.json()) as Member;
}

/** `PATCH /api/v1/projects/{projectId}/members/{userId}`: changes the role of a member. */
export async function updateMemberRole(
  projectId: number,
  userId: number,
  role: ProjectRole,
): Promise<Member> {
  const response = await apiFetch(`${membersPath(projectId)}/${userId}`, {
    method: 'PATCH',
    body: { role },
  });
  return (await response.json()) as Member;
}

/** `DELETE /api/v1/projects/{projectId}/members/{userId}`: takes the user out of the project. */
export async function removeMember(projectId: number, userId: number): Promise<void> {
  await apiFetch(`${membersPath(projectId)}/${userId}`, { method: 'DELETE' });
}
