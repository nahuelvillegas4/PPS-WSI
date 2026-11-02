import { describe, expect, it } from 'vitest';
import { TILE_PROBE_URL, interpretTileProbe, probeTileMode } from './tileProbe';

describe('interpretTileProbe', () => {
  it('reads 200 as the development overlay (no session was asked for)', () => {
    expect(interpretTileProbe(200)).toBe('dev-overlay');
  });

  it('reads 401 as real session authorization', () => {
    expect(interpretTileProbe(401)).toBe('session');
  });

  it.each([403, 404, 500, 502, 204, 302])('reads %i as unknown', (status) => {
    expect(interpretTileProbe(status)).toBe('unknown');
  });

  it('reads a network error and a timeout as unknown', () => {
    expect(interpretTileProbe('network-error')).toBe('unknown');
    expect(interpretTileProbe('timeout')).toBe('unknown');
  });
});

interface Seen {
  url: string;
  init: RequestInit | undefined;
}

function fakeFetch(respond: (init: RequestInit | undefined) => Promise<Response>, seen: Seen[]) {
  return ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    seen.push({ url, init });
    return respond(init);
  }) as typeof fetch;
}

describe('probeTileMode', () => {
  const live = () => new AbortController().signal;

  it('asks once, without credentials and without cache, for the public tile descriptor', async () => {
    const seen: Seen[] = [];
    const fetchFn = fakeFetch(() => Promise.resolve(new Response(null, { status: 200 })), seen);

    await probeTileMode(live(), { fetchFn });

    expect(seen).toHaveLength(1);
    expect(seen[0]?.url).toBe(TILE_PROBE_URL);
    expect(seen[0]?.url).not.toContain('/internal/');
    expect(seen[0]?.init?.credentials).toBe('omit');
    expect(seen[0]?.init?.cache).toBe('no-store');
    expect(seen[0]?.init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('returns dev-overlay for 200 and session for 401', async () => {
    const ok = fakeFetch(() => Promise.resolve(new Response(null, { status: 200 })), []);
    const denied = fakeFetch(() => Promise.resolve(new Response(null, { status: 401 })), []);
    expect(await probeTileMode(live(), { fetchFn: ok })).toBe('dev-overlay');
    expect(await probeTileMode(live(), { fetchFn: denied })).toBe('session');
  });

  it('returns unknown for 403 and 500', async () => {
    for (const status of [403, 500]) {
      const fetchFn = fakeFetch(() => Promise.resolve(new Response(null, { status })), []);
      expect(await probeTileMode(live(), { fetchFn })).toBe('unknown');
    }
  });

  it('returns unknown when the request fails', async () => {
    const fetchFn = fakeFetch(() => Promise.reject(new TypeError('Failed to fetch')), []);
    expect(await probeTileMode(live(), { fetchFn })).toBe('unknown');
  });

  it('gives up after the timeout and returns unknown', async () => {
    const hangs = fakeFetch(
      (init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('aborted', 'AbortError'));
          });
        }),
      [],
    );
    expect(await probeTileMode(live(), { fetchFn: hangs, timeoutMs: 20 })).toBe('unknown');
  });

  it('returns unknown when the caller aborts (the page was left)', async () => {
    const controller = new AbortController();
    const hangs = fakeFetch(
      (init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('aborted', 'AbortError'));
          });
        }),
      [],
    );
    const result = probeTileMode(controller.signal, { fetchFn: hangs, timeoutMs: 5000 });
    controller.abort();
    expect(await result).toBe('unknown');
  });
});
