import { ApiError, apiFetch, NetworkError } from '../../shared/api';

/** Contract limits of `LoginRequest` (api.v1.yaml). */
export const USERNAME_MAX_LENGTH = 64;
export const PASSWORD_MAX_LENGTH = 256;

export type Role = 'admin' | 'annotator';

/** `CurrentUser` of the contract: who owns the session. */
export interface CurrentUser {
  id: number;
  username: string;
  role: Role;
}

/** `POST /api/v1/auth/login`: on success the API answers 204 and sets the `gia_session` cookie. */
export async function login(username: string, password: string): Promise<void> {
  await apiFetch('/api/v1/auth/login', { method: 'POST', body: { username, password } });
}

/** `POST /api/v1/auth/logout`. A 401 means the session was already gone, which is the goal. */
export async function logout(): Promise<void> {
  try {
    await apiFetch('/api/v1/auth/logout', { method: 'POST' });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return;
    throw error;
  }
}

/** `GET /api/v1/auth/me`: the session user, or `null` when there is no valid session. */
export async function fetchCurrentUser(signal?: AbortSignal): Promise<CurrentUser | null> {
  try {
    const response = await apiFetch('/api/v1/auth/me', signal ? { signal } : {});
    return (await response.json()) as CurrentUser;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

/** Message shown on the login screen for a failed attempt. */
export function loginErrorMessage(error: unknown): string {
  if (error instanceof NetworkError) {
    return 'No se pudo contactar al servidor. Verificá que la pasarela esté levantada.';
  }
  if (error instanceof ApiError) {
    switch (error.status) {
      case 400:
        return 'Completá el usuario y la contraseña.';
      case 401:
        return 'Usuario o contraseña incorrectos.';
      case 429:
        return 'Demasiados intentos fallidos. Esperá unos minutos antes de volver a intentar.';
      default:
        if (error.status >= 500) {
          return 'El servidor no está disponible en este momento. Reintentá en unos segundos.';
        }
        return error.problem?.detail ?? `Error inesperado (HTTP ${error.status}).`;
    }
  }
  return 'Ocurrió un error inesperado.';
}
