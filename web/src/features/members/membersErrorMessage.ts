import { ApiError, NetworkError } from '../../shared/api';

const PROBLEM_PREFIX = 'urn:gia:problem:';

/** `user-not-found` out of `urn:gia:problem:user-not-found`; `null` when the error has no problem. */
function slugOf(error: ApiError): string | null {
  const type = error.problem?.type;
  return type?.startsWith(PROBLEM_PREFIX) ? type.slice(PROBLEM_PREFIX.length) : null;
}

/** Message shown on the members screen for a failed request, from its status and problem slug. */
export function membersErrorMessage(status: number, problemSlug: string | null): string {
  if (status === 404 && problemSlug === 'user-not-found') {
    return 'No se encontró un usuario que se pueda asignar con ese nombre. Revisá que esté bien escrito y que la cuenta exista.';
  }
  if (status === 409 && problemSlug === 'already-member') {
    return 'Ese usuario ya es miembro del proyecto. Para cambiar su rol usá el selector de la tabla.';
  }
  switch (status) {
    case 400:
      return 'Revisá los datos: el nombre de usuario admite minúsculas, números, punto, guion y guion bajo (3 a 64 caracteres).';
    case 401:
      return 'Tu sesión venció. Volvé a iniciar sesión.';
    case 403:
      return 'No tenés permiso para administrar los miembros de este proyecto.';
    case 404:
      return 'No se encontró el proyecto o el miembro: puede que ya no exista o que no tengas acceso.';
    default:
      if (status >= 500) {
        return 'El servidor no está disponible en este momento. Reintentá en unos segundos.';
      }
      return `No se pudo completar la operación (HTTP ${status}).`;
  }
}

/** Message for whatever a members request threw. */
export function describeMembersError(error: unknown): string {
  if (error instanceof NetworkError) {
    return 'No se pudo contactar al servidor. Verificá que la pasarela esté levantada.';
  }
  if (error instanceof ApiError) return membersErrorMessage(error.status, slugOf(error));
  return 'Ocurrió un error inesperado.';
}
