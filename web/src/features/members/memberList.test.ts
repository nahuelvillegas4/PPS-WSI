import { describe, expect, it } from 'vitest';
import type { User } from '../users/usersApi';
import { assignableUsers, upsertMember, withoutMember } from './memberList';
import type { Member } from './membersApi';

function member(userId: number, username: string, role: Member['role'] = 'viewer'): Member {
  return { userId, username, role, isActive: true, createdAt: '2026-11-01T10:00:00Z' };
}

function user(id: number, username: string, overrides: Partial<User> = {}): User {
  return {
    id,
    username,
    role: 'user',
    isActive: true,
    createdAt: '2026-11-01T10:00:00Z',
    ...overrides,
  };
}

describe('upsertMember', () => {
  it('appends a member that is not in the list', () => {
    const result = upsertMember([member(1, 'ana')], member(2, 'beto'));
    expect(result.map((m) => m.username)).toEqual(['ana', 'beto']);
  });

  it('replaces the entry of the same user without reordering', () => {
    const result = upsertMember(
      [member(1, 'ana'), member(2, 'beto')],
      member(1, 'ana', 'project-admin'),
    );
    expect(result).toEqual([member(1, 'ana', 'project-admin'), member(2, 'beto')]);
  });

  it('does not mutate the given list', () => {
    const original = [member(1, 'ana')];
    upsertMember(original, member(2, 'beto'));
    expect(original).toHaveLength(1);
  });
});

describe('withoutMember', () => {
  it('drops only the given user', () => {
    expect(withoutMember([member(1, 'ana'), member(2, 'beto')], 1)).toEqual([member(2, 'beto')]);
  });

  it('leaves the list as is when the user is not there', () => {
    expect(withoutMember([member(1, 'ana')], 9)).toEqual([member(1, 'ana')]);
  });
});

describe('assignableUsers', () => {
  it('keeps active plain users who are not members yet, sorted by username', () => {
    const users = [
      user(1, 'admin', { role: 'admin' }),
      user(2, 'carla'),
      user(3, 'beto', { isActive: false }),
      user(4, 'ana'),
      user(5, 'diego'),
    ];

    const result = assignableUsers(users, [member(5, 'diego')]);

    expect(result.map((u) => u.username)).toEqual(['ana', 'carla']);
  });

  it('is empty when everybody is already a member', () => {
    expect(assignableUsers([user(1, 'ana')], [member(1, 'ana')])).toEqual([]);
  });
});
