/**
 * Upload queue: framework-free state that sends the chosen files one after another.
 *
 * The uploader is injected, so the queue is tested without a network. React reads it through
 * `subscribe`/`getSnapshot` (`useSyncExternalStore`); nothing here starts by itself: work begins
 * only when `start()` is called, which the UI does from an event handler.
 */
import { filterFiles, type RejectedFile } from './fileFilter';
import { uploadErrorMessage } from './uploadApi';

export type UploadStatus = 'queued' | 'uploading' | 'done' | 'failed' | 'cancelled';

export interface UploadItem {
  readonly id: number;
  readonly file: File;
  readonly status: UploadStatus;
  /** Share of the file already sent, 0-100. */
  readonly progress: number;
  /** Spanish message; only set when `status` is `failed`. */
  readonly error: string | null;
}

export interface UploadQueueState {
  readonly items: readonly UploadItem[];
  /** True from `start()` until the last file settles. */
  readonly running: boolean;
}

export interface UploadHandlers {
  onProgress: (percent: number) => void;
  /** Aborted by `cancelAll`; the uploader must then reject. */
  signal: AbortSignal;
}

/** Sends one file. Resolves when the server registered it, rejects otherwise. */
export type Uploader = (file: File, handlers: UploadHandlers) => Promise<void>;

/** How the files of one `start()` ended. */
export interface RunSummary {
  succeeded: number;
  failed: number;
  cancelled: number;
}

export interface UploadQueue {
  getSnapshot: () => UploadQueueState;
  subscribe: (listener: () => void) => () => void;
  /** Queues the files that pass `filterFiles`; returns the ones left out, with the reason. */
  add: (files: readonly File[]) => RejectedFile<File>[];
  /** Sends the queued files in order. A second call while running joins the run in progress. */
  start: () => Promise<RunSummary>;
  /** Aborts the file in flight and cancels the ones still waiting. */
  cancelAll: () => void;
}

/** A failed or cancelled name may be picked again; one that is waiting, in flight or done may not. */
const NAME_TAKEN: readonly UploadStatus[] = ['queued', 'uploading', 'done'];

export function createUploadQueue(uploader: Uploader): UploadQueue {
  let state: UploadQueueState = { items: [], running: false };
  let nextId = 1;
  let inFlight: AbortController | null = null;
  let run: Promise<RunSummary> | null = null;
  let summary: RunSummary = { succeeded: 0, failed: 0, cancelled: 0 };
  const listeners = new Set<() => void>();

  function setState(next: UploadQueueState): void {
    state = next;
    for (const listener of [...listeners]) listener();
  }

  function patch(id: number, changes: Partial<Pick<UploadItem, 'status' | 'progress' | 'error'>>) {
    setState({
      ...state,
      items: state.items.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    });
  }

  function reportProgress(id: number, percent: number): void {
    if (!Number.isFinite(percent)) return;
    const progress = Math.min(100, Math.max(0, Math.round(percent)));
    const item = state.items.find((candidate) => candidate.id === id);
    if (item?.status !== 'uploading' || item.progress === progress) return;
    patch(id, { progress });
  }

  function nextQueued(): UploadItem | undefined {
    return state.items.find((item) => item.status === 'queued');
  }

  async function drain(): Promise<RunSummary> {
    summary = { succeeded: 0, failed: 0, cancelled: 0 };
    setState({ ...state, running: true });

    for (let item = nextQueued(); item; item = nextQueued()) {
      const controller = new AbortController();
      const { id, file } = item;
      inFlight = controller;
      patch(id, { status: 'uploading', progress: 0 });
      try {
        await uploader(file, {
          signal: controller.signal,
          onProgress: (percent) => {
            reportProgress(id, percent);
          },
        });
        patch(id, { status: 'done', progress: 100 });
        summary.succeeded += 1;
      } catch (error) {
        if (controller.signal.aborted) {
          patch(id, { status: 'cancelled' });
          summary.cancelled += 1;
        } else {
          patch(id, { status: 'failed', error: uploadErrorMessage(error) });
          summary.failed += 1;
        }
      }
    }

    inFlight = null;
    setState({ ...state, running: false });
    return summary;
  }

  return {
    getSnapshot: () => state,

    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    add: (files) => {
      const taken = state.items
        .filter((item) => NAME_TAKEN.includes(item.status))
        .map((item) => item.file.name);
      const { accepted, rejected } = filterFiles(files, taken);
      if (accepted.length > 0) {
        const added = accepted.map((file): UploadItem => ({
          id: nextId++,
          file,
          status: 'queued',
          progress: 0,
          error: null,
        }));
        setState({ ...state, items: [...state.items, ...added] });
      }
      return rejected;
    },

    start: () => {
      if (run) return run;
      if (!nextQueued()) return Promise.resolve({ succeeded: 0, failed: 0, cancelled: 0 });
      run = drain().finally(() => {
        run = null;
      });
      return run;
    },

    cancelAll: () => {
      const waiting = state.items.filter((item) => item.status === 'queued').length;
      if (waiting > 0) {
        summary.cancelled += waiting;
        setState({
          ...state,
          items: state.items.map((item) =>
            item.status === 'queued' ? { ...item, status: 'cancelled' } : item,
          ),
        });
      }
      inFlight?.abort();
    },
  };
}
