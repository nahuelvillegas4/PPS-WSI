import { ApiError, NetworkError } from '../../shared/api';

const PROBLEM_PREFIX = 'urn:gia:problem:';

/** `duplicate-name` out of `urn:gia:problem:duplicate-name`; `null` when the error has no problem. */
function problemSlug(error: ApiError): string | null {
  const type = error.problem?.type;
  return type?.startsWith(PROBLEM_PREFIX) ? type.slice(PROBLEM_PREFIX.length) : null;
}

/** Message shown on the users screen for a failed request, from its status and problem slug. */
export function usersErrorMessage(status: number, slug: string | null): string {
  if (status === 409 && slug === 'duplicate-name') {
    return 'Ya existe un usuario con ese nombre. Elegí otro.';
  }
  switch (status) {
    case 400:
      return 'Revisá los datos: el nombre de usuario admite minúsculas, números, punto, guion y guion bajo (3 a 64 caracteres) y la contraseña debe tener entre 12 y 256 caracteres.';
    case 401:
      return 'Tu sesión venció. Volvé a iniciar sesión.';
    case 403:
      return 'Solo el administrador global puede gestionar usuarios.';
    default:
      if (status >= 500) {
        return 'El servidor no está disponible en este momento. Reintentá en unos segundos.';
      }
      return `No se pudo completar la operación (HTTP ${status}).`;
  }
}

/** Message for whatever a users request threw. */
export function describeUserError(error: unknown): string {
  if (error instanceof NetworkError) {
    return 'No se pudo contactar al servidor. Verificá que la pasarela esté levantada.';
  }
  if (error instanceof ApiError) return usersErrorMessage(error.status, problemSlug(error));
  return 'Ocurrió un error inesperado.';
}
