import type { User } from '../users/usersApi';
import type { Member } from './membersApi';

/** The list with `member` added, or replacing the entry of the same user. */
export function upsertMember(members: readonly Member[], member: Member): Member[] {
  if (!members.some((current) => current.userId === member.userId)) return [...members, member];
  return members.map((current) => (current.userId === member.userId ? member : current));
}

/** The list without the given user. */
export function withoutMember(members: readonly Member[], userId: number): Member[] {
  return members.filter((current) => current.userId !== userId);
}

/**
 * Accounts the global admin can still assign to the project: active, role `user` (a global admin
 * already has every project) and not yet a member. Sorted by username.
 */
export function assignableUsers(users: readonly User[], members: readonly Member[]): User[] {
  const memberIds = new Set(members.map((member) => member.userId));
  return users
    .filter((user) => user.isActive && user.role === 'user' && !memberIds.has(user.id))
    .toSorted((a, b) => a.username.localeCompare(b.username));
}
