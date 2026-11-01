import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, NetworkError } from '../../shared/api';
import { uploadErrorMessage, uploadImage } from './uploadApi';

/** Minimal stand-in for XMLHttpRequest: records what was sent and lets the test play the server. */
class FakeXhr {
  static instances: FakeXhr[] = [];

  method = '';
  url = '';
  headers: Record<string, string> = {};
  body: unknown = null;
  withCredentials = false;
  aborted = false;
  status = 0;
  responseText = '';
  upload: { onprogress: ((event: ProgressEvent) => void) | null } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;

  constructor() {
    FakeXhr.instances.push(this);
  }

  open(method: string, url: string): void {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(name: string, value: string): void {
    this.headers[name] = value;
  }

  send(body: unknown): void {
    this.body = body;
  }

  abort(): void {
    this.aborted = true;
    this.onabort?.();
  }

  progress(loaded: number, total: number, lengthComputable = true): void {
    this.upload.onprogress?.({ loaded, total, lengthComputable } as ProgressEvent);
  }

  respond(status: number, text = ''): void {
    this.status = status;
    this.responseText = text;
    this.onload?.();
  }

  fail(): void {
    this.onerror?.();
  }
}

function lastXhr(): FakeXhr {
  const xhr = FakeXhr.instances.at(-1);
  if (!xhr) throw new Error('No request was sent.');
  return xhr;
}

function slide(name = 'slide.svs'): File {
  return new File(['pixels'], name, { type: 'application/octet-stream' });
}

function problemBody(status: number, slug: string, detail: string): string {
  return JSON.stringify({ type: `urn:gia:problem:${slug}`, title: slug, status, detail });
}

beforeEach(() => {
  FakeXhr.instances = [];
  vi.stubGlobal('XMLHttpRequest', FakeXhr);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('uploadImage', () => {
  it('posts one file as the multipart field "files" to the contract route', async () => {
    const promise = uploadImage(7, slide('biopsy.svs'));
    const xhr = lastXhr();

    expect(xhr.method).toBe('POST');
    expect(xhr.url).toBe('/api/v1/datasets/7/images/upload');
    expect(xhr.body).toBeInstanceOf(FormData);
    const parts = (xhr.body as FormData).getAll('files');
    expect(parts).toHaveLength(1);
    expect((parts[0] as File).name).toBe('biopsy.svs');

    xhr.respond(201, JSON.stringify({ items: [] }));
    await expect(promise).resolves.toBeUndefined();
  });

  it('leaves Content-Type to the browser and relies on same-origin credentials', async () => {
    const promise = uploadImage(7, slide());
    const xhr = lastXhr();

    expect(Object.keys(xhr.headers).map((name) => name.toLowerCase())).not.toContain(
      'content-type',
    );
    expect(xhr.withCredentials).toBe(false);

    xhr.respond(201);
    await promise;
  });

  it('reports the sent share as a 0-100 percentage', async () => {
    const onProgress = vi.fn<(percent: number) => void>();
    const promise = uploadImage(7, slide(), { onProgress });
    const xhr = lastXhr();

    xhr.progress(0, 200);
    xhr.progress(50, 200);
    xhr.progress(199, 200);
    xhr.progress(200, 200);
    xhr.progress(10, 0);
    xhr.progress(10, 200, false);

    expect(onProgress.mock.calls.map(([percent]) => percent)).toEqual([0, 25, 99, 100]);

    xhr.respond(201);
    await promise;
  });

  it('turns a problem+json answer into an ApiError that carries the problem', async () => {
    const promise = uploadImage(7, slide());
    lastXhr().respond(409, problemBody(409, 'already-registered', 'La imagen ya está registrada.'));

    const error = await promise.catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(409);
    expect((error as ApiError).problem?.type).toBe('urn:gia:problem:already-registered');
    expect((error as ApiError).message).toBe('La imagen ya está registrada.');
  });

  it('maps a non-JSON error body, such as an Nginx 413 page, by status', async () => {
    const promise = uploadImage(7, slide());
    lastXhr().respond(413, '<html><body><h1>413 Request Entity Too Large</h1></body></html>');

    const error = await promise.catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(413);
    expect((error as ApiError).problem).toBeNull();
  });

  it('turns a failed connection into a NetworkError', async () => {
    const promise = uploadImage(7, slide());
    lastXhr().fail();
    await expect(promise).rejects.toBeInstanceOf(NetworkError);
  });

  it('aborts the request when the signal fires and rejects with an AbortError', async () => {
    const controller = new AbortController();
    const promise = uploadImage(7, slide(), { signal: controller.signal });
    const xhr = lastXhr();

    controller.abort();

    expect(xhr.aborted).toBe(true);
    const error = await promise.catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(DOMException);
    expect((error as DOMException).name).toBe('AbortError');
  });

  it('does not send anything when the signal was already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(uploadImage(7, slide(), { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(FakeXhr.instances).toHaveLength(0);
  });

  it('stops listening to the signal once the request ended', async () => {
    const controller = new AbortController();
    const promise = uploadImage(7, slide(), { signal: controller.signal });
    const xhr = lastXhr();
    xhr.respond(201);
    await promise;

    controller.abort();
    expect(xhr.aborted).toBe(false);
  });
});

describe('uploadErrorMessage', () => {
  it('shows the detail the server sent', () => {
    const problem = {
      type: 't',
      title: 'x',
      status: 409,
      detail: 'Ya hay una imagen con esa clave.',
    };
    expect(uploadErrorMessage(new ApiError(409, problem))).toBe('Ya hay una imagen con esa clave.');
  });

  it.each([
    [400, /no aceptó la petición/],
    [401, /sesión venció/],
    [403, /No tenés permiso/],
    [404, /no existe o no tenés acceso/],
    [409, /Ya existe un archivo/],
    [413, /supera el tamaño máximo/],
    [422, /no pudo leer el archivo/],
    [503, /no está disponible/],
    [507, /No hay espacio libre/],
    [500, /HTTP 500/],
  ])('explains a %d without a body', (status, expected) => {
    expect(uploadErrorMessage(new ApiError(status, null))).toMatch(expected);
  });

  it('explains a connection failure', () => {
    expect(uploadErrorMessage(new NetworkError())).toMatch(/Se cortó la conexión/);
  });

  it('has a fallback for anything else', () => {
    expect(uploadErrorMessage(new Error('x'))).toBe(
      'Ocurrió un error inesperado al subir el archivo.',
    );
  });
});
