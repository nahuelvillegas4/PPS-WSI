/**
 * Browser upload of one image to a dataset: `POST /api/v1/datasets/{datasetId}/images/upload`.
 *
 * It uses XMLHttpRequest because `fetch` cannot report upload progress. Like the rest of the SPA it
 * talks to the gateway on the same origin, so the session cookie travels on its own (ADR-04).
 */
import { ApiError, NetworkError, readProblem } from '../../shared/api';

export interface UploadOptions {
  /** Called with the share of the body already sent, 0-100. */
  onProgress?: (percent: number) => void;
  /** Aborting it cancels the request and rejects with an `AbortError`. */
  signal?: AbortSignal;
}

function abortError(): DOMException {
  return new DOMException('La subida fue cancelada.', 'AbortError');
}

/**
 * Sends `file` as the single `files` part of a multipart body (the contract allows many; the web
 * sends one per request). Resolves when the server registered it; otherwise rejects with `ApiError`
 * (any non-2xx status), `NetworkError` (no answer) or an `AbortError` (cancelled).
 *
 * `Content-Type` is left to the browser: it must carry the multipart boundary.
 */
export function uploadImage(
  datasetId: number,
  file: File,
  { onProgress, signal }: UploadOptions = {},
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }

    const xhr = new XMLHttpRequest();
    const onAbortSignal = () => {
      xhr.abort();
    };
    const finish = (settle: () => void) => {
      signal?.removeEventListener('abort', onAbortSignal);
      settle();
    };

    xhr.open('POST', `/api/v1/datasets/${datasetId}/images/upload`);
    // Same-origin requests already send the session cookie: `withCredentials` is left untouched.
    xhr.setRequestHeader('Accept', 'application/json');

    xhr.upload.onprogress = (event) => {
      if (!onProgress || !event.lengthComputable || event.total <= 0) return;
      onProgress(Math.min(100, Math.floor((event.loaded / event.total) * 100)));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        finish(resolve);
        return;
      }
      // The body may be an RFC 9457 problem or a proxy page (e.g. an Nginx HTML 413): the status
      // alone is still enough to explain it.
      void readProblem(new Response(xhr.responseText)).then((problem) => {
        finish(() => {
          reject(new ApiError(xhr.status, problem));
        });
      });
    };
    xhr.onerror = () => {
      finish(() => {
        reject(new NetworkError());
      });
    };
    xhr.onabort = () => {
      finish(() => {
        reject(abortError());
      });
    };

    signal?.addEventListener('abort', onAbortSignal, { once: true });

    const body = new FormData();
    body.append('files', file, file.name);
    xhr.send(body);
  });
}

function messageForStatus(status: number): string {
  switch (status) {
    case 400:
      return 'El servidor no aceptó la petición. Revisá el archivo e intentá de nuevo.';
    case 401:
      return 'Tu sesión venció. Volvé a iniciar sesión.';
    case 403:
      return 'No tenés permiso para subir imágenes a este dataset.';
    case 404:
      return 'El dataset no existe o no tenés acceso a él.';
    case 409:
      return 'Ya existe un archivo con ese nombre en el servidor.';
    case 413:
      return 'El archivo supera el tamaño máximo que acepta el servidor.';
    case 422:
      return 'El servidor no pudo leer el archivo como una imagen válida.';
    case 503:
      return 'El servicio de imágenes no está disponible por ahora. Probá de nuevo en unos minutos.';
    case 507:
      return 'No hay espacio libre en el servidor para este archivo.';
    default:
      return `El servidor respondió con un error (HTTP ${status}).`;
  }
}

/** Spanish message for a failed upload: the server's own detail when it sent one. */
export function uploadErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.problem?.detail ?? messageForStatus(error.status);
  if (error instanceof NetworkError) {
    return 'Se cortó la conexión con el servidor. Puede que haya rechazado el archivo antes de recibirlo completo (por ejemplo, por su tamaño).';
  }
  return 'Ocurrió un error inesperado al subir el archivo.';
}
