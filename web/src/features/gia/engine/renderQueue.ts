/**
 * Serialises Mermaid renders (the library is not re-entrant), hands out unique element ids and
 * caches successful renders. Failures are never cached, so a later attempt can succeed.
 */
export interface RenderQueue {
  /** Next unique element id: `gia-d-1`, `gia-d-2`, ... */
  nextElementId(): string;
  /** Runs `task` after every earlier task settled; a rejection does not block the queue. */
  enqueue<T>(task: () => Promise<T>): Promise<T>;
  /** Like `enqueue`, but remembers a successful result under `key` and shares in-flight work. */
  cached<T>(key: string, task: () => Promise<T>): Promise<T>;
  has(key: string): boolean;
  clear(): void;
}

export function createRenderQueue(prefix = 'gia-d'): RenderQueue {
  let counter = 0;
  let tail: Promise<unknown> = Promise.resolve();
  const cache = new Map<string, Promise<unknown>>();

  function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = tail.then(task, task);
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
