import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, NetworkError } from '../../shared/api';
import { createUser, fetchUsers } from './usersApi';

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

afterEach(() => {
  vi.unstubAllGlobals();
});

const ADMIN = {
  id: 1,
  username: 'admin',
  role: 'admin',
  isActive: true,
  createdAt: '2026-11-01T10:00:00Z',
};

describe('fetchUsers', () => {
  it('reads the items of the list from the contract route', async () => {
    const mock = stubFetch(Response.json({ items: [ADMIN] }));

    await expect(fetchUsers()).resolves.toEqual([ADMIN]);

    const [path, init] = mock.mock.calls[0] as unknown as [string, RequestInit];
    expect(path).toBe('/api/v1/users');
    expect(init.method).toBe('GET');
    expect(init.credentials).toBe('same-origin');
  });

  it('turns a 403 into an ApiError carrying the problem', async () => {
    stubFetch(problem(403, 'forbidden'));
    const error = await fetchUsers().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(403);
    expect((error as ApiError).problem?.type).toBe('urn:gia:problem:forbidden');
  });

  it('turns a failed connection into a NetworkError', async () => {
    stubFetch(new TypeError('Failed to fetch'));
    await expect(fetchUsers()).rejects.toBeInstanceOf(NetworkError);
  });
});

describe('createUser', () => {
  it('posts exactly username, password and role and returns the created user', async () => {
    const created = { ...ADMIN, id: 2, username: 'ana.perez', role: 'user' };
    const mock = stubFetch(Response.json(created, { status: 201 }));

    const result = await createUser({
      username: 'ana.perez',
      password: 'una-clave-larga-1',
      role: 'user',
    });

    expect(result).toEqual(created);
    expect(mock).toHaveBeenCalledOnce();
    const [path, init] = mock.mock.calls[0] as unknown as [string, RequestInit];
    expect(path).toBe('/api/v1/users');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body as string)).toEqual({
      username: 'ana.perez',
      password: 'una-clave-larga-1',
      role: 'user',
    });
  });

  it('turns a 409 duplicate-name into an ApiError with its slug', async () => {
    stubFetch(problem(409, 'duplicate-name'));
    const error = await createUser({
      username: 'admin',
      password: 'una-clave-larga-1',
      role: 'user',
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(409);
    expect((error as ApiError).problem?.type).toBe('urn:gia:problem:duplicate-name');
  });
});
