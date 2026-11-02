/**
 * Live check of how this instance authorizes tiles, shown only in the flows stop.
 *
 * The probe asks for a tile descriptor without a session: with the development overlay the
 * gateway answers 200 (a fixed key, no access check); with real authorization it answers 401.
 * A probe made with an admin cookie could not tell the modes apart, hence `credentials: 'omit'`.
 * It never touches the internal access-check route.
 */

export type TileMode = 'dev-overlay' | 'session' | 'unknown';

/** What a probe observed: an HTTP status, or why there is none. */
export type TileProbeOutcome = number | 'network-error' | 'timeout';

export const TILE_PROBE_URL = '/tiles/v1/images/1.dzi';
export const TILE_PROBE_TIMEOUT_MS = 3000;

export function interpretTileProbe(outcome: TileProbeOutcome): TileMode {
  if (outcome === 200) return 'dev-overlay';
  if (outcome === 401) return 'session';
  return 'unknown';
}

export interface TileProbeOptions {
  /** Replaceable in tests. */
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}

/**
 * Makes the request once and interprets it. Never rejects: a network failure, a timeout (3 s) and
 * a caller abort all end as `unknown`.
 */
export async function probeTileMode(
  signal: AbortSignal,
  options: TileProbeOptions = {},
): Promise<TileMode> {
  const fetchFn = options.fetchFn ?? fetch;
  const timeout = AbortSignal.timeout(options.timeoutMs ?? TILE_PROBE_TIMEOUT_MS);
  try {
    const response = await fetchFn(TILE_PROBE_URL, {
      credentials: 'omit',
      cache: 'no-store',
      signal: AbortSignal.any([signal, timeout]),
    });
    // Only the status matters; do not download the body.
    void response.body?.cancel().catch(() => undefined);
    return interpretTileProbe(response.status);
  } catch {
    return interpretTileProbe(timeout.aborted ? 'timeout' : 'network-error');
  }
}
