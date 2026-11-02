import { afterEach, describe, expect, it, vi } from 'vitest';
import { RENDER_TIMEOUT_MS, RenderTimeoutError, createRenderQueue } from './renderQueue';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('createRenderQueue', () => {
  it('hands out unique sequential element ids', () => {
    const queue = createRenderQueue();
    expect([queue.nextElementId(), queue.nextElementId(), queue.nextElementId()]).toEqual([
      'gia-d-1',
      'gia-d-2',
      'gia-d-3',
    ]);
  });

  it('never runs two tasks at once and keeps the order of arrival', async () => {
    const queue = createRenderQueue();
    const log: string[] = [];
    const first = deferred<string>();
    const a = queue.enqueue(async () => {
      log.push('a:start');
      const value = await first.promise;
      log.push('a:end');
      return value;
    });
    const b = queue.enqueue(() => {
      log.push('b:start');
      return Promise.resolve('b');
    });
    await Promise.resolve();
    expect(log).toEqual(['a:start']);
    first.resolve('a');
    expect(await a).toBe('a');
    expect(await b).toBe('b');
    expect(log).toEqual(['a:start', 'a:end', 'b:start']);
  });

  it('keeps running after a task fails', async () => {
    const queue = createRenderQueue();
    const failing = queue.enqueue(() => Promise.reject(new Error('boom')));
    const next = queue.enqueue(() => Promise.resolve('ok'));
    await expect(failing).rejects.toThrow('boom');
    expect(await next).toBe('ok');
  });

  it('shares an in-flight render and remembers a successful one', async () => {
    const queue = createRenderQueue();
    let runs = 0;
    const task = () => {
      runs += 1;
      return Promise.resolve(`svg-${String(runs)}`);
    };
    const [one, two] = await Promise.all([
      queue.cached('tesela:light', task),
      queue.cached('tesela:light', task),
    ]);
    expect([one, two]).toEqual(['svg-1', 'svg-1']);
    expect(await queue.cached('tesela:light', task)).toBe('svg-1');
    expect(queue.has('tesela:light')).toBe(true);
    expect(runs).toBe(1);
  });

  it('keys the cache by diagram and scheme', async () => {
    const queue = createRenderQueue();
    const task = (value: string) => () => Promise.resolve(value);
    expect(await queue.cached('tesela:light', task('claro'))).toBe('claro');
    expect(await queue.cached('tesela:dark', task('oscuro'))).toBe('oscuro');
    expect(await queue.cached('tesela:light', task('otro'))).toBe('claro');
  });

  it('does not cache a failure, so the next call tries again', async () => {
    const queue = createRenderQueue();
    await expect(queue.cached('g:light', () => Promise.reject(new Error('x')))).rejects.toThrow(
      'x',
    );
    await Promise.resolve();
    expect(queue.has('g:light')).toBe(false);
    expect(await queue.cached('g:light', () => Promise.resolve('fine'))).toBe('fine');
  });

  it('forgets everything on clear', async () => {
    const queue = createRenderQueue();
    await queue.cached('a:light', () => Promise.resolve(1));
    queue.clear();
    expect(queue.has('a:light')).toBe(false);
  });
});

describe('createRenderQueue timeout', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('rejects a task that never settles and lets the ones behind it run', async () => {
    vi.useFakeTimers();
    const queue = createRenderQueue('gia-d', 1000);
    const stuck = queue.enqueue(() => new Promise<string>(() => undefined));
    const next = queue.enqueue(() => Promise.resolve('ok'));
    const rejected = expect(stuck).rejects.toBeInstanceOf(RenderTimeoutError);
    await vi.advanceTimersByTimeAsync(1000);
    await rejected;
    expect(await next).toBe('ok');
  });

  it('leaves a task that settles in time alone and clears its timer', async () => {
    vi.useFakeTimers();
    const queue = createRenderQueue('gia-d', 1000);
    const first = deferred<string>();
    const run = queue.enqueue(() => first.promise);
    await vi.advanceTimersByTimeAsync(900);
    first.resolve('done');
    expect(await run).toBe('done');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps the original error of a task that fails before the limit', async () => {
    vi.useFakeTimers();
    const queue = createRenderQueue('gia-d', 1000);
    await expect(queue.enqueue(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not cache a timeout, so the next call tries again', async () => {
    vi.useFakeTimers();
    const queue = createRenderQueue('gia-d', 1000);
    const stuck = queue.cached('g:light', () => new Promise<string>(() => undefined));
    const rejected = expect(stuck).rejects.toBeInstanceOf(RenderTimeoutError);
    await vi.advanceTimersByTimeAsync(1000);
    await rejected;
    expect(queue.has('g:light')).toBe(false);
    expect(await queue.cached('g:light', () => Promise.resolve('fine'))).toBe('fine');
  });

  it('gives a task 20 seconds by default', () => {
    expect(RENDER_TIMEOUT_MS).toBe(20_000);
  });
});
