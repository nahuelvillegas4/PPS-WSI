import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, NetworkError } from '../../shared/api';
import {
  addMember,
  fetchMembers,
  fetchProjectSummary,
  removeMember,
  updateMemberRole,
} from './membersApi';

function problem(status: number, slug: string): Response {
  return new Response(
    JSON.stringify({ type: `urn:gia:problem:${slug}`, title: slug, status, traceId: 't-1' }),
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );
}

function stubFetch(response: Response | Error) {
  const mock = vi.fn(() =>
    response instanceof Error ? Promise.reject(response) : Promise.resolve(response),
  );
  vi.stubGlobal('fetch', mock);
  return mock;
}

function firstCall(mock: ReturnType<typeof stubFetch>): [string, RequestInit] {
  return mock.mock.calls[0] as unknown as [string, RequestInit];
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const MEMBER = {
  userId: 7,
  username: 'ana.perez',
  role: 'annotator',
  isActive: true,
  createdAt: '2026-11-01T10:00:00Z',
};

describe('fetchProjectSummary', () => {
  it('reads the project from the contract route', async () => {
    const mock = stubFetch(Response.json({ id: 3, name: 'Mama', myRole: 'viewer' }));

    await expect(fetchProjectSummary(3)).resolves.toMatchObject({ id: 3, name: 'Mama' });

    const [path, init] = firstCall(mock);
    expect(path).toBe('/api/v1/projects/3');
    expect(init.method).toBe('GET');
  });

  it('turns a 404 into an ApiError', async () => {
    stubFetch(problem(404, 'not-found'));
    const error = await fetchProjectSummary(3).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(404);
  });
});

describe('fetchMembers', () => {
  it('reads the items of the list from the members route', async () => {
    const mock = stubFetch(Response.json({ items: [MEMBER] }));

    await expect(fetchMembers(3)).resolves.toEqual([MEMBER]);

    const [path, init] = firstCall(mock);
    expect(path).toBe('/api/v1/projects/3/members');
    expect(init.method).toBe('GET');
    expect(init.credentials).toBe('same-origin');
  });

  it('turns a 403 into an ApiError carrying the problem', async () => {
    stubFetch(problem(403, 'forbidden'));
    const error = await fetchMembers(3).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(403);
    expect((error as ApiError).problem?.type).toBe('urn:gia:problem:forbidden');
  });

  it('turns a failed connection into a NetworkError', async () => {
    stubFetch(new TypeError('Failed to fetch'));
    await expect(fetchMembers(3)).rejects.toBeInstanceOf(NetworkError);
  });
});

describe('addMember', () => {
  it('posts exactly username and role and returns the new member', async () => {
    const mock = stubFetch(Response.json(MEMBER, { status: 201 }));

    await expect(addMember(3, { username: 'ana.perez', role: 'annotator' })).resolves.toEqual(
      MEMBER,
    );

    const [path, init] = firstCall(mock);
    expect(path).toBe('/api/v1/projects/3/members');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body as string)).toEqual({ username: 'ana.perez', role: 'annotator' });
  });

  it('keeps the slug of a user-not-found 404 and of an already-member 409', async () => {
    stubFetch(problem(404, 'user-not-found'));
    const notFound = await addMember(3, { username: 'nadie', role: 'viewer' }).catch(
      (caught: unknown) => caught,
    );
    expect((notFound as ApiError).problem?.type).toBe('urn:gia:problem:user-not-found');

    stubFetch(problem(409, 'already-member'));
    const conflict = await addMember(3, { username: 'ana.perez', role: 'viewer' }).catch(
      (caught: unknown) => caught,
    );
    expect((conflict as ApiError).status).toBe(409);
    expect((conflict as ApiError).problem?.type).toBe('urn:gia:problem:already-member');
  });
});

describe('updateMemberRole', () => {
  it('patches only the role of that member and returns it', async () => {
    const updated = { ...MEMBER, role: 'project-admin' };
    const mock = stubFetch(Response.json(updated));

    await expect(updateMemberRole(3, 7, 'project-admin')).resolves.toEqual(updated);

    const [path, init] = firstCall(mock);
    expect(path).toBe('/api/v1/projects/3/members/7');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ role: 'project-admin' });
  });
});

describe('removeMember', () => {
  it('deletes the membership and resolves on 204', async () => {
    const mock = stubFetch(new Response(null, { status: 204 }));

    await expect(removeMember(3, 7)).resolves.toBeUndefined();

    const [path, init] = firstCall(mock);
    expect(path).toBe('/api/v1/projects/3/members/7');
    expect(init.method).toBe('DELETE');
    expect(init.body).toBeUndefined();
  });

  it('turns a 404 (not a member) into an ApiError', async () => {
    stubFetch(problem(404, 'not-found'));
    await expect(removeMember(3, 7)).rejects.toBeInstanceOf(ApiError);
  });
});
