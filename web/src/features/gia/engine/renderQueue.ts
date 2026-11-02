/**
 * Serialises Mermaid renders (the library is not re-entrant), hands out unique element ids and
 * caches successful renders. Failures are never cached, so a later attempt can succeed. A task
 * that does not settle within the time limit is rejected, so it cannot block the ones behind it.
 */

/** How long one task (cold Mermaid import included) may take before the queue gives up on it. */
export const RENDER_TIMEOUT_MS = 20_000;

/** A queued task did not settle in time; the caller shows an error card with a retry. */
export class RenderTimeoutError extends Error {
  constructor(ms: number) {
    super(`The task did not settle within ${String(ms)} ms.`);
    this.name = 'RenderTimeoutError';
  }
}

/**
 * Settles with `task`, or rejects with `RenderTimeoutError` after `ms`. A late result of the
 * abandoned task is ignored; its own rejection is already handled here, so it never goes unhandled.
 */
function runWithTimeout<T>(task: () => Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new RenderTimeoutError(ms));
    }, ms);
    task().then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

export interface RenderQueue {
  /** Next unique element id: `gia-d-1`, `gia-d-2`, ... */
  nextElementId(): string;
  /** Runs `task` after every earlier task settled; a rejection or a timeout does not block the queue. */
  enqueue<T>(task: () => Promise<T>): Promise<T>;
  /** Like `enqueue`, but remembers a successful result under `key` and shares in-flight work. */
  cached<T>(key: string, task: () => Promise<T>): Promise<T>;
  has(key: string): boolean;
  clear(): void;
}

export function createRenderQueue(prefix = 'gia-d', timeoutMs = RENDER_TIMEOUT_MS): RenderQueue {
  let counter = 0;
  let tail: Promise<unknown> = Promise.resolve();
  const cache = new Map<string, Promise<unknown>>();

  function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const guarded = () => runWithTimeout(task, timeoutMs);
    const run = tail.then(guarded, guarded);
    tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  return {
    nextElementId() {
      counter += 1;
      return `${prefix}-${counter}`;
    },
    enqueue,
    cached<T>(key: string, task: () => Promise<T>): Promise<T> {
      const known = cache.get(key) as Promise<T> | undefined;
      if (known) return known;
      const run = enqueue(task);
      cache.set(key, run);
      run.catch(() => {
        if (cache.get(key) === run) cache.delete(key);
      });
      return run;
    },
    has(key) {
      return cache.has(key);
    },
    clear() {
      cache.clear();
    },
  };
}
