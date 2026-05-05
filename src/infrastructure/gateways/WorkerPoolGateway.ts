type StreamState<T> = {
  doneCount: number;
  error: Error | null;
  queue: Array<T>;
  queueReadIndex: number;
  resolve: (() => void) | null;
};

export default class WorkerPoolGateway {
  private static readonly POOL = new Map<string, Array<Worker>>();

  static computePoolSize(): number {
    const deviceMemoryGb = (globalThis.navigator as { deviceMemory?: number }).deviceMemory;
    return Math.min(
      8,
      Math.max(
        1,
        deviceMemoryGb !== undefined ? Math.floor(deviceMemoryGb) : Math.floor(globalThis.navigator.hardwareConcurrency / 2),
      ),
    );
  }

  static createStreamState<T>(): StreamState<T> {
    return { doneCount: 0, error: null, queue: [], queueReadIndex: 0, resolve: null };
  }

  static async *drainStream<T>(state: StreamState<T>, isDone: () => boolean): AsyncGenerator<T> {
    for (;;) {
      while (state.queueReadIndex >= state.queue.length) {
        if (state.error !== null) throw state.error;
        if (isDone()) return;
        await new Promise<void>(res => {
          state.resolve = res;
        });
        state.resolve = null;
      }
      const msg = state.queue[state.queueReadIndex++];
      if (msg === undefined) throw new ReferenceError('expected worker message, got undefined');
      if (state.queueReadIndex > 64) {
        state.queue.splice(0, state.queueReadIndex);
        state.queueReadIndex = 0;
      }
      yield msg;
    }
  }

  static getPoolSize(key: string): number {
    return WorkerPoolGateway.POOL.get(key)?.length ?? 0;
  }

  static returnToPool(key: string, worker: Worker): void {
    const existing = WorkerPoolGateway.POOL.get(key) ?? [];
    existing.push(worker);
    WorkerPoolGateway.POOL.set(key, existing);
  }

  static takeFromPool(key: string): undefined | Worker {
    return WorkerPoolGateway.POOL.get(key)?.pop();
  }

  static wireWorker<T>(worker: Worker, state: StreamState<T>, isDoneMessage: (msg: T) => boolean): void {
    worker.onmessage = (event: MessageEvent<T>) => {
      if (isDoneMessage(event.data)) state.doneCount++;
      else state.queue.push(event.data);
      state.resolve?.();
    };
    worker.onerror = () => {
      state.error = new Error('worker error');
      state.resolve?.();
    };
  }
}
