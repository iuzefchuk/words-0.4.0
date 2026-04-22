import {
  WorkerRequest,
  WorkerRequestType,
  WorkerResponse,
  WorkerResponseType,
  WorkerService,
} from '@/application/types/ports.ts';

type StreamState = {
  doneCount: number;
  error: Error | null;
  queue: Array<WorkerResponse>;
  queueReadIndex: number;
  resolve: (() => void) | null;
};

export default class WebWorkerService implements WorkerService {
  private readonly pool = new Map<string, Array<Worker>>();

  constructor(private readonly workers: Record<string, new () => Worker>) {}

  private static createStreamState(): StreamState {
    return { doneCount: 0, error: null, queue: [], queueReadIndex: 0, resolve: null };
  }

  private static async *drainStream<O>(state: StreamState, isDone: () => boolean): AsyncGenerator<O> {
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
      if (msg.type === WorkerResponseType.Error) throw new Error(msg.error);
      if (msg.type === WorkerResponseType.Done) return;
      if (msg.type === WorkerResponseType.Result) yield msg.value as O;
    }
  }

  private static wireWorker(worker: Worker, state: StreamState): void {
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.type === WorkerResponseType.Done) state.doneCount++;
      else state.queue.push(event.data);
      state.resolve?.();
    };
    worker.onerror = () => {
      state.error = new Error('worker error');
      state.resolve?.();
    };
  }

  getPoolSize(taskId: string): number {
    return this.pool.get(taskId)?.length ?? 0;
  }

  async init(taskId: string, data: unknown): Promise<void> {
    const deviceMemoryGb = (globalThis.navigator as { deviceMemory?: number }).deviceMemory;
    const poolSize = Math.min(
      8,
      Math.max(
        1,
        deviceMemoryGb !== undefined ? Math.floor(deviceMemoryGb) : Math.floor(globalThis.navigator.hardwareConcurrency / 2),
      ),
    );
    const workers = Array.from({ length: poolSize }, () => this.createWorker(taskId));
    await Promise.all(workers.map(worker => this.initWorker(worker, data)));
    for (const worker of workers) this.returnToPool(taskId, worker);
  }

  async *stream<O>(taskId: string, data: unknown): AsyncGenerator<O> {
    const worker = this.createWorker(taskId);
    const state = WebWorkerService.createStreamState();
    WebWorkerService.wireWorker(worker, state);
    worker.postMessage({ input: data, type: WorkerRequestType.Stream } satisfies WorkerRequest);
    try {
      yield* WebWorkerService.drainStream<O>(state, () => state.doneCount > 0);
    } finally {
      worker.terminate();
    }
  }

  async *streamParallel<O>(taskId: string, inputs: ReadonlyArray<unknown>): AsyncGenerator<O> {
    const workers: Array<Worker> = inputs.map(() => this.takeFromPool(taskId) ?? this.createWorker(taskId));
    const state = WebWorkerService.createStreamState();
    const totalWorkers = workers.length;
    for (let idx = 0; idx < workers.length; idx++) {
      const worker = workers[idx];
      if (worker === undefined) throw new ReferenceError(`expected worker at index ${String(idx)}, got undefined`);
      WebWorkerService.wireWorker(worker, state);
      worker.postMessage({ input: inputs[idx], type: WorkerRequestType.Stream } satisfies WorkerRequest);
    }
    try {
      yield* WebWorkerService.drainStream<O>(state, () => state.doneCount >= totalWorkers);
    } finally {
      if (state.doneCount >= totalWorkers) {
        for (const worker of workers) this.returnToPool(taskId, worker);
      } else {
        for (const worker of workers) worker.terminate();
      }
    }
  }

  private createWorker(taskId: string): Worker {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const WorkerConstructor = this.workers[taskId];
    if (WorkerConstructor === undefined) throw new Error(`no worker registered for task ${taskId}`);
    return new WorkerConstructor();
  }

  private initWorker(worker: Worker, data: unknown): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        if (event.data.type === WorkerResponseType.Ready) resolve();
        else reject(new Error(`expected worker Ready response, got ${event.data.type}`));
      };
      worker.onerror = () => {
        reject(new Error('worker error'));
      };
      worker.postMessage({ input: data, type: WorkerRequestType.Init } satisfies WorkerRequest);
    });
  }

  private returnToPool(taskId: string, worker: Worker): void {
    const existing = this.pool.get(taskId) ?? [];
    existing.push(worker);
    this.pool.set(taskId, existing);
  }

  private takeFromPool(taskId: string): undefined | Worker {
    return this.pool.get(taskId)?.pop();
  }
}
