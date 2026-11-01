/**
 * Pure rules for the files a person picks to upload (contract: `POST /datasets/{id}/images/upload`).
 *
 * There is no size cap here on purpose: the server owns that limit and answers 413.
 */

/** Extensions the upload endpoint accepts, lowercase. */
export const ALLOWED_EXTENSIONS: readonly string[] = ['.svs', '.png', '.jpg', '.jpeg'];

/** Value for the `accept` attribute of the file input. */
export const ACCEPT_ATTRIBUTE = ALLOWED_EXTENSIONS.join(',');

/** The part of a `File` the filter looks at, so it can be tested without a DOM. */
export interface FileLike {
  readonly name: string;
  readonly size: number;
}

export interface RejectedFile<T extends FileLike> {
  readonly file: T;
  /** Why it was left out, in Spanish, ready to show. */
  readonly reason: string;
}

export interface FilterResult<T extends FileLike> {
  readonly accepted: T[];
  readonly rejected: RejectedFile<T>[];
}

/** Lowercase extension including the dot, or `''` when the name has none. */
function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot < 0 ? '' : name.slice(dot).toLowerCase();
}

/**
 * Splits `candidates` into the ones that can be uploaded and the ones that cannot.
 * `takenNames` are names already chosen; names are compared ignoring case, also inside the batch.
 */
export function filterFiles<T extends FileLike>(
  candidates: readonly T[],
  takenNames: readonly string[] = [],
): FilterResult<T> {
  const seen = new Set(takenNames.map((name) => name.toLowerCase()));
  const accepted: T[] = [];
  const rejected: RejectedFile<T>[] = [];

  for (const file of candidates) {
    const key = file.name.toLowerCase();
    let reason: string | null = null;
    if (!ALLOWED_EXTENSIONS.includes(extensionOf(file.name))) {
      reason = 'Formato no admitido: solo se pueden subir archivos .svs, .png, .jpg o .jpeg.';
    } else if (file.size === 0) {
      reason = 'El archivo está vacío.';
    } else if (seen.has(key)) {
      reason = 'Ya elegiste un archivo con ese nombre.';
    }

    if (reason === null) {
      seen.add(key);
      accepted.push(file);
    } else {
      rejected.push({ file, reason });
    }
  }

  return { accepted, rejected };
}
