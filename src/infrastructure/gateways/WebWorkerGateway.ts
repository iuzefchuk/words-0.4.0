import {
  WorkerGateway,
  WorkerRequest,
  WorkerRequestType,
  WorkerResponse,
  WorkerResponseType,
} from '@/application/types/ports.ts';
import WorkerPoolGateway from '@/infrastructure/gateways/WorkerPoolGateway.ts';

export default class WebWorkerGateway implements WorkerGateway {
  constructor(private readonly workers: Record<string, new () => Worker>) {}

  getPoolSize(taskId: string): number {
    return WorkerPoolGateway.getPoolSize(taskId);
  }

  async init(taskId: string, data: unknown): Promise<void> {
    const workers = Array.from({ length: WorkerPoolGateway.computePoolSize() }, () => this.createWorker(taskId));
    await Promise.all(workers.map(worker => this.initWorker(worker, data)));
    for (const worker of workers) WorkerPoolGateway.returnToPool(taskId, worker);
  }

  async *stream<O>(taskId: string, data: unknown): AsyncGenerator<O> {
    const worker = this.createWorker(taskId);
    const state = WorkerPoolGateway.createStreamState<WorkerResponse>();
    WorkerPoolGateway.wireWorker(worker, state, msg => msg.type === WorkerResponseType.Done);
    worker.postMessage({ input: data, type: WorkerRequestType.Stream } satisfies WorkerRequest);
    try {
      for await (const msg of WorkerPoolGateway.drainStream(state, () => state.doneCount > 0)) {
        if (msg.type === WorkerResponseType.Error) throw new Error(msg.error);
        if (msg.type === WorkerResponseType.Result) yield msg.value as O;
      }
    } finally {
      worker.terminate();
    }
  }

  async *streamParallel<O>(taskId: string, inputs: ReadonlyArray<unknown>): AsyncGenerator<O> {
    const workers: Array<Worker> = inputs.map(() => WorkerPoolGateway.takeFromPool(taskId) ?? this.createWorker(taskId));
    const state = WorkerPoolGateway.createStreamState<WorkerResponse>();
    const totalWorkers = workers.length;
    for (let idx = 0; idx < workers.length; idx++) {
      const worker = workers[idx];
      if (worker === undefined) throw new ReferenceError(`expected worker at index ${String(idx)}, got undefined`);
      WorkerPoolGateway.wireWorker(worker, state, msg => msg.type === WorkerResponseType.Done);
      worker.postMessage({ input: inputs[idx], type: WorkerRequestType.Stream } satisfies WorkerRequest);
    }
    try {
      for await (const msg of WorkerPoolGateway.drainStream(state, () => state.doneCount >= totalWorkers)) {
        if (msg.type === WorkerResponseType.Error) throw new Error(msg.error);
        if (msg.type === WorkerResponseType.Result) yield msg.value as O;
      }
    } finally {
      if (state.doneCount >= totalWorkers) {
        for (const worker of workers) WorkerPoolGateway.returnToPool(taskId, worker);
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
}
