import { describe, expect, it, vi } from 'vitest';
import { ApiError, NetworkError } from '../../shared/api';
import { createUploadQueue, type Uploader, type UploadHandlers } from './uploadQueue';

interface PendingUpload extends UploadHandlers {
  file: File;
  resolve: () => void;
  reject: (reason: unknown) => void;
}

/** An uploader the test drives by hand; it rejects with an AbortError when its signal fires. */
function manualUploader() {
  const calls: PendingUpload[] = [];
  const uploader: Uploader = (file, handlers) =>
    new Promise<void>((resolve, reject) => {
      handlers.signal.addEventListener('abort', () => {
        reject(new DOMException('La subida fue cancelada.', 'AbortError'));
      });
      calls.push({ ...handlers, file, resolve, reject });
    });
  return { uploader, calls };
}

function call(calls: PendingUpload[], index: number): PendingUpload {
  const found = calls[index];
  if (!found) throw new Error(`Upload #${index} was not started.`);
  return found;
}

function png(name: string, size = 10): File {
  return new File([new Uint8Array(size)], name);
}

/** Lets the queue's pending promise callbacks run. */
function flush(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function summaryOf(queue: ReturnType<typeof createUploadQueue>) {
  return queue.getSnapshot().items.map((item) => [item.file.name, item.status]);
}

describe('add', () => {
  it('queues the accepted files and returns the rejected ones with their reason', () => {
    const queue = createUploadQueue(manualUploader().uploader);

    const rejected = queue.add([png('a.png'), png('notes.txt'), png('empty.jpg', 0)]);

    expect(summaryOf(queue)).toEqual([['a.png', 'queued']]);
    expect(rejected.map((entry) => entry.file.name)).toEqual(['notes.txt', 'empty.jpg']);
    expect(rejected.every((entry) => entry.reason.length > 0)).toBe(true);
    expect(queue.getSnapshot().items[0]).toMatchObject({ progress: 0, error: null });
  });

  it('refuses a name that is already waiting, ignoring case', () => {
    const queue = createUploadQueue(manualUploader().uploader);
    queue.add([png('a.png')]);

    const rejected = queue.add([png('A.PNG')]);

    expect(rejected).toHaveLength(1);
    expect(queue.getSnapshot().items).toHaveLength(1);
  });

  it('lets a failed or cancelled name be picked again but not a finished one', async () => {
    const { uploader, calls } = manualUploader();
    const queue = createUploadQueue(uploader);
    queue.add([png('ok.png'), png('bad.png')]);
    const run = queue.start();
    call(calls, 0).resolve();
    await flush();
    call(calls, 1).reject(new NetworkError());
    await run;

    expect(queue.add([png('ok.png')])).toHaveLength(1);
    expect(queue.add([png('bad.png')])).toEqual([]);
    expect(queue.getSnapshot().items).toHaveLength(3);
  });

  it('keeps the same snapshot until something changes and notifies subscribers', () => {
    const queue = createUploadQueue(manualUploader().uploader);
    const listener = vi.fn();
    const unsubscribe = queue.subscribe(listener);
    const before = queue.getSnapshot();

    queue.add([png('notes.txt')]);
    expect(queue.getSnapshot()).toBe(before);
    expect(listener).not.toHaveBeenCalled();

    queue.add([png('a.png')]);
    expect(queue.getSnapshot()).not.toBe(before);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    queue.add([png('b.png')]);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('start', () => {
  it('sends the files one at a time, in order', async () => {
    const { uploader, calls } = manualUploader();
    const queue = createUploadQueue(uploader);
    queue.add([png('a.png'), png('b.png'), png('c.png')]);

    const run = queue.start();
    expect(queue.getSnapshot().running).toBe(true);
    expect(calls.map((c) => c.file.name)).toEqual(['a.png']);
    expect(summaryOf(queue)).toEqual([
      ['a.png', 'uploading'],
      ['b.png', 'queued'],
      ['c.png', 'queued'],
    ]);

    call(calls, 0).resolve();
    await flush();
    expect(calls.map((c) => c.file.name)).toEqual(['a.png', 'b.png']);

    call(calls, 1).resolve();
    await flush();
    call(calls, 2).resolve();

    await expect(run).resolves.toEqual({ succeeded: 3, failed: 0, cancelled: 0 });
    expect(queue.getSnapshot().running).toBe(false);
    expect(queue.getSnapshot().items.map((item) => [item.status, item.progress])).toEqual([
      ['done', 100],
      ['done', 100],
      ['done', 100],
    ]);
  });

  it('follows the progress of the file in flight and clamps it to 0-100', async () => {
    const { uploader, calls } = manualUploader();
    const queue = createUploadQueue(uploader);
    queue.add([png('a.png')]);
    const run = queue.start();
    const progressOf = () => queue.getSnapshot().items[0]?.progress;

    call(calls, 0).onProgress(40.4);
    expect(progressOf()).toBe(40);
    call(calls, 0).onProgress(250);
    expect(progressOf()).toBe(100);
    call(calls, 0).onProgress(-5);
    expect(progressOf()).toBe(0);
    call(calls, 0).onProgress(Number.NaN);
    expect(progressOf()).toBe(0);

    call(calls, 0).resolve();
    await run;
    call(calls, 0).onProgress(10);
    expect(progressOf()).toBe(100);
  });

  it('marks a failure with the server detail and keeps going with the next file', async () => {
    const { uploader, calls } = manualUploader();
    const queue = createUploadQueue(uploader);
    queue.add([png('a.png'), png('b.png')]);
    const run = queue.start();

    const problem = {
      type: 't',
      title: 'x',
      status: 409,
      detail: 'Ya hay una imagen con esa clave.',
    };
    call(calls, 0).reject(new ApiError(409, problem));
    await flush();
    call(calls, 1).reject(new NetworkError());

    await expect(run).resolves.toEqual({ succeeded: 0, failed: 2, cancelled: 0 });
    const [first, second] = queue.getSnapshot().items;
    expect(first).toMatchObject({ status: 'failed', error: 'Ya hay una imagen con esa clave.' });
    expect(second?.status).toBe('failed');
    expect(second?.error).toMatch(/Se cortó la conexión/);
  });

  it('also fails a file whose uploader throws synchronously', async () => {
    const queue = createUploadQueue(() => {
      throw new Error('boom');
    });
    queue.add([png('a.png')]);

    await expect(queue.start()).resolves.toEqual({ succeeded: 0, failed: 1, cancelled: 0 });
    expect(queue.getSnapshot().items[0]?.error).toBe(
      'Ocurrió un error inesperado al subir el archivo.',
    );
  });

  it('does nothing when no file is waiting', async () => {
    const { uploader, calls } = manualUploader();
    const queue = createUploadQueue(uploader);
    const listener = vi.fn();
    queue.subscribe(listener);

    await expect(queue.start()).resolves.toEqual({ succeeded: 0, failed: 0, cancelled: 0 });
    expect(calls).toHaveLength(0);
    expect(listener).not.toHaveBeenCalled();
  });

  it('joins the run in progress instead of starting a second one', async () => {
    const { uploader, calls } = manualUploader();
    const queue = createUploadQueue(uploader);
    queue.add([png('a.png')]);

    const first = queue.start();
    const second = queue.start();
    expect(second).toBe(first);

    call(calls, 0).resolve();
    await first;
    expect(calls).toHaveLength(1);
  });

  it('can run again for files added after a run ended', async () => {
    const { uploader, calls } = manualUploader();
    const queue = createUploadQueue(uploader);
    queue.add([png('a.png')]);
    const first = queue.start();
    call(calls, 0).resolve();
    await first;

    queue.add([png('b.png')]);
    const second = queue.start();
    call(calls, 1).resolve();

    await expect(second).resolves.toEqual({ succeeded: 1, failed: 0, cancelled: 0 });
  });
});

describe('cancelAll', () => {
  it('aborts the file in flight and cancels the ones still waiting', async () => {
    const { uploader, calls } = manualUploader();
    const queue = createUploadQueue(uploader);
    queue.add([png('a.png'), png('b.png'), png('c.png')]);
    const run = queue.start();

    queue.cancelAll();

    expect(call(calls, 0).signal.aborted).toBe(true);
    await expect(run).resolves.toEqual({ succeeded: 0, failed: 0, cancelled: 3 });
    expect(calls).toHaveLength(1);
    expect(summaryOf(queue)).toEqual([
      ['a.png', 'cancelled'],
      ['b.png', 'cancelled'],
      ['c.png', 'cancelled'],
    ]);
    expect(queue.getSnapshot().running).toBe(false);
  });

  it('keeps what already finished and counts it in the summary', async () => {
    const { uploader, calls } = manualUploader();
    const queue = createUploadQueue(uploader);
    queue.add([png('a.png'), png('b.png'), png('c.png')]);
    const run = queue.start();
    call(calls, 0).resolve();
    await flush();

    queue.cancelAll();

    await expect(run).resolves.toEqual({ succeeded: 1, failed: 0, cancelled: 2 });
    expect(summaryOf(queue)).toEqual([
      ['a.png', 'done'],
      ['b.png', 'cancelled'],
      ['c.png', 'cancelled'],
    ]);
  });

  it('cancels waiting files when nothing is running and never uploads them', async () => {
    const { uploader, calls } = manualUploader();
    const queue = createUploadQueue(uploader);
    queue.add([png('a.png')]);

    queue.cancelAll();

    expect(summaryOf(queue)).toEqual([['a.png', 'cancelled']]);
    await expect(queue.start()).resolves.toEqual({ succeeded: 0, failed: 0, cancelled: 0 });
    expect(calls).toHaveLength(0);
  });

  it('is harmless on an empty queue', () => {
    const queue = createUploadQueue(manualUploader().uploader);
    expect(() => {
      queue.cancelAll();
    }).not.toThrow();
  });
});
