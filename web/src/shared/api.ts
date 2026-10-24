/**
 * Minimal HTTP client for the management API (contract/openapi/api.v1.yaml).
 *
 * The SPA talks only to the gateway (same origin, ADR-01), so every path is relative and the
 * session cookie `gia_session` travels on its own: no token ever reaches JavaScript (ADR-04).
 */

/** RFC 9457 error body, as every API error answers (ADR-05). */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  traceId?: string;
  errors?: Record<string, string[]>;
}

/** The API answered with a non-2xx status. */
export class ApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetails | null;

  constructor(status: number, problem: ProblemDetails | null) {
    super(problem?.detail ?? problem?.title ?? `HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.problem = problem;
  }
}

/** The request never got an answer (gateway down, no network). */
export class NetworkError extends Error {
  constructor(options?: ErrorOptions) {
    super('No se pudo contactar al servidor.', options);
    this.name = 'NetworkError';
  }
}

export interface ApiRequest {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Serialized as JSON: the API only accepts `application/json` bodies (CSRF, §8.4). */
  body?: unknown;
  signal?: AbortSignal;
}

function isProblem(value: unknown): value is ProblemDetails {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.status === 'number' && typeof candidate.title === 'string';
}

/** Reads an RFC 9457 body; `null` when the error has no such body (e.g. a proxy page). */
export async function readProblem(response: Response): Promise<ProblemDetails | null> {
  try {
    const body: unknown = await response.json();
    return isProblem(body) ? body : null;
  } catch {
    return null;
  }
}

/** Sends a request and throws `ApiError` or `NetworkError` when it does not succeed. */
export async function apiFetch(path: string, request: ApiRequest = {}): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const init: RequestInit = {
    method: request.method ?? 'GET',
    credentials: 'same-origin',
    headers,
  };
  if (request.signal) init.signal = request.signal;
  if (request.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(request.body);
  }

  let response: Response;
  try {
    response = await fetch(path, init);
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    throw new NetworkError({ cause });
  }

  if (!response.ok) throw new ApiError(response.status, await readProblem(response));
  return response;
}
