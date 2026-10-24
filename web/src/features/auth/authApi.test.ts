import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, NetworkError } from '../../shared/api';
import { fetchCurrentUser, login, loginErrorMessage, logout } from './authApi';

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

describe('login', () => {
  it('posts the credentials as JSON to the contract route', async () => {
    const mock = stubFetch(new Response(null, { status: 204 }));
    await login('admin', 'secret');

    expect(mock).toHaveBeenCalledOnce();
    const [path, init] = mock.mock.calls[0] as unknown as [string, RequestInit];
    expect(path).toBe('/api/v1/auth/login');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('same-origin');
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body as string)).toEqual({ username: 'admin', password: 'secret' });
  });

  it('turns a 401 into an ApiError carrying the problem', async () => {
    stubFetch(problem(401, 'unauthenticated'));
    const error = await login('admin', 'bad').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(401);
    expect((error as ApiError).problem?.type).toBe('urn:gia:problem:unauthenticated');
  });

  it('turns a failed connection into a NetworkError', async () => {
    stubFetch(new TypeError('Failed to fetch'));
    await expect(login('admin', 'secret')).rejects.toBeInstanceOf(NetworkError);
  });
});

describe('fetchCurrentUser', () => {
  it('returns the session user', async () => {
    const user = { id: 1, username: 'admin', role: 'admin' };
    stubFetch(Response.json(user));
    await expect(fetchCurrentUser()).resolves.toEqual(user);
  });

  it('returns null without a session', async () => {
    stubFetch(problem(401, 'unauthenticated'));
    await expect(fetchCurrentUser()).resolves.toBeNull();
  });

  it('propagates server errors instead of pretending there is no session', async () => {
    stubFetch(new Response('Bad gateway', { status: 502 }));
    await expect(fetchCurrentUser()).rejects.toBeInstanceOf(ApiError);
  });
});

describe('logout', () => {
  it('treats an already expired session as logged out', async () => {
    stubFetch(problem(401, 'unauthenticated'));
    await expect(logout()).resolves.toBeUndefined();
  });
});

describe('loginErrorMessage', () => {
  it.each([
    [new ApiError(400, null), 'Completá el usuario y la contraseña.'],
    [new ApiError(401, null), 'Usuario o contraseña incorrectos.'],
    [new ApiError(429, null), /Demasiados intentos/],
    [new ApiError(503, null), /no está disponible/],
    [new NetworkError(), /No se pudo contactar/],
    [new Error('x'), 'Ocurrió un error inesperado.'],
  ])('maps %s', (error, expected) => {
    expect(loginErrorMessage(error)).toMatch(expected);
  });
});
