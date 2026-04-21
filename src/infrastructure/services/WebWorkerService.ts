import { WorkerService } from '@/application/types/ports.ts';

export const enum WorkerRequestType {
  Init = 'Init',
  Stream = 'Stream',
}

export const enum WorkerResponseType {
  Done = 'Done',
  Error = 'Error',
  Ready = 'Ready',
  Result = 'Result',
}

type WorkerRequest = { input: unknown; type: WorkerRequestType };

type WorkerResponse =
  | { error: string; type: WorkerResponseType.Error }
  | { type: WorkerResponseType.Done }
  | { type: WorkerResponseType.Ready }
  | { type: WorkerResponseType.Result; value: unknown };

export default class WebWorkerService implements WorkerService {
  private readonly pool = new Map<string, Array<Worker>>();

  constructor(private readonly workers: Record<string, new () => Worker>) {}

  getPoolSize(taskId: string): number {
    return this.pool.get(taskId)?.length ?? 0;
  }

  async init(taskId: string, data: unknown): Promise<void> {
    const deviceMemoryGb = (globalThis.navigator as { deviceMemory?: number })?.deviceMemory;
    const poolSize = Math.min(
      8,
      Math.max(
        1,
        deviceMemoryGb !== undefined
          ? Math.floor(deviceMemoryGb)
          : Math.floor((globalThis.navigator?.hardwareConcurrency ?? 2) / 2),
      ),
    );
    const workers = Array.from({ length: poolSize }, () => this.createWorker(taskId));
    await Promise.all(workers.map(worker => this.initWorker(worker, data)));
    for (const worker of workers) this.returnToPool(taskId, worker);
  }

  async *stream<O>(taskId: string, data: unknown): AsyncGenerator<O> {
    const worker = this.createWorker(taskId);
    const queue: Array<WorkerResponse> = [];
    let queueReadIndex = 0;
    let resolve: (() => void) | null = null;
    let error: Error | null = null;
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      queue.push(e.data);
      resolve?.();
    };
    worker.onerror = e => {
      error = e instanceof Error ? e : new Error(String(e));
      resolve?.();
    };
    worker.postMessage({ input: data, type: WorkerRequestType.Stream } satisfies WorkerRequest);
    try {
      while (true) {
        while (queueReadIndex >= queue.length) {
          if (error !== null) throw error;
          await new Promise<void>(r => {
            resolve = r;
          });
          resolve = null;
        }
        const msg = queue[queueReadIndex++];
        if (msg === undefined) throw new ReferenceError('Message must be defined');
        if (queueReadIndex > 64) {
          queue.splice(0, queueReadIndex);
          queueReadIndex = 0;
        }
        if (msg.type === WorkerResponseType.Error) throw new Error(msg.error);
        if (msg.type === WorkerResponseType.Done) return;
        if (msg.type === WorkerResponseType.Result) yield msg.value as O;
      }
    } finally {
      worker.terminate();
    }
  }

  async *streamParallel<O>(taskId: string, inputs: ReadonlyArray<unknown>): AsyncGenerator<O> {
    const workers: Array<Worker> = inputs.map(() => this.takeFromPool(taskId) ?? this.createWorker(taskId));
    const queue: Array<WorkerResponse> = [];
    let queueReadIndex = 0;
    let resolve: (() => void) | null = null;
    let error: Error | null = null;
    let doneCount = 0;
    const totalWorkers = workers.length;
    for (let i = 0; i < workers.length; i++) {
      const worker = workers[i];
      if (worker === undefined) throw new ReferenceError('Worker must be defined');
      worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        if (e.data.type === WorkerResponseType.Done) doneCount++;
        else queue.push(e.data);
        resolve?.();
      };
      worker.onerror = e => {
        error = e instanceof Error ? e : new Error(String(e));
        resolve?.();
      };
      worker.postMessage({ input: inputs[i], type: WorkerRequestType.Stream } satisfies WorkerRequest);
    }
    try {
      while (true) {
        while (queueReadIndex >= queue.length) {
          if (error !== null) throw error;
          if (doneCount >= totalWorkers) return;
          await new Promise<void>(r => {
            resolve = r;
          });
          resolve = null;
        }
        const msg = queue[queueReadIndex++];
        if (msg === undefined) throw new ReferenceError('Message must be defined');
        if (queueReadIndex > 64) {
          queue.splice(0, queueReadIndex);
          queueReadIndex = 0;
        }
        if (msg.type === WorkerResponseType.Error) throw new Error(msg.error);
        if (msg.type === WorkerResponseType.Result) yield msg.value as O;
      }
    } finally {
      if (doneCount >= totalWorkers) {
        for (const worker of workers) this.returnToPool(taskId, worker);
      } else {
        for (const worker of workers) worker.terminate();
      }
    }
  }

  private createWorker(taskId: string): Worker {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const WorkerConstructor = this.workers[taskId];
    if (WorkerConstructor === undefined) throw new Error(`No worker registered for task: ${taskId}`);
    return new WorkerConstructor();
  }

  private initWorker(worker: Worker, data: unknown): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        if (e.data.type === WorkerResponseType.Ready) resolve();
        else reject(new Error('Unexpected response during init'));
      };
      worker.onerror = e => reject(e instanceof Error ? e : new Error(String(e)));
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
