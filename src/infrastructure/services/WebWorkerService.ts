import { WorkerService } from '@/application/types/ports.ts';

export const enum WorkerRequestType {
  Execute = 'Execute',
  Stream = 'Stream',
}

export const enum WorkerResponseType {
  Done = 'Done',
  Error = 'Error',
  Result = 'Result',
}

type WorkerRequest = { input: unknown; type: WorkerRequestType };

type WorkerResponse =
  | { error: string; type: WorkerResponseType.Error }
  | { type: WorkerResponseType.Done }
  | { type: WorkerResponseType.Result; value: unknown };

export default class WebWorkerService implements WorkerService {
  constructor(private readonly workers: Record<string, new () => Worker>) {}

  execute<O>(taskId: string, data: unknown): Promise<O> {
    const worker = this.createWorker(taskId);
    return new Promise<O>((resolve, reject) => {
      worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        worker.terminate();
        if (e.data.type === WorkerResponseType.Result) resolve(e.data.value as O);
        else if (e.data.type === WorkerResponseType.Error) reject(new Error(e.data.error));
        else reject(new Error('Unexpected response'));
      };
      worker.onerror = e => {
        worker.terminate();
        reject(e);
      };
      worker.postMessage({ input: data, type: WorkerRequestType.Execute } satisfies WorkerRequest);
    });
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
          if (error) throw error;
          await new Promise<void>(r => {
            resolve = r;
          });
          resolve = null;
        }
        const msg = queue[queueReadIndex++]!;
        if (queueReadIndex > 64) {
          queue.splice(0, queueReadIndex);
          queueReadIndex = 0;
        }
        if (msg.type === WorkerResponseType.Error) throw new Error(msg.error);
        if (msg.type === WorkerResponseType.Done) return;
        yield msg.value as O;
      }
    } finally {
      worker.terminate();
    }
  }

  private createWorker(taskId: string): Worker {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const WorkerConstructor = this.workers[taskId];
    if (!WorkerConstructor) throw new Error(`No worker registered for task: ${taskId}`);
    return new WorkerConstructor();
  }
}
