export type { IdentifierService, RandomizerService } from '@/domain/types/ports.ts';

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

export type LoaderService = {
  load(url: string): Promise<ArrayBufferLike>;
};

export type ObserverService = {
  notify(value: number): void;
  observe(callback: (value: number) => void): void;
};

export type SchedulerService = {
  padTo<T>(minimumMs: number, callback: () => Promise<T> | T): Promise<T>;
  yield(): Promise<void>;
};

export type WorkerRequest = { input: unknown; type: WorkerRequestType };

export type WorkerResponse =
  | { error: string; type: WorkerResponseType.Error }
  | { type: WorkerResponseType.Done }
  | { type: WorkerResponseType.Ready }
  | { type: WorkerResponseType.Result; value: unknown };

export type WorkerService = {
  getPoolSize(taskId: string): number;
  init(taskId: string, data: unknown): Promise<void>;
  stream<O>(taskId: string, data: unknown): AsyncGenerator<O>;
  streamParallel<O>(taskId: string, inputs: ReadonlyArray<unknown>): AsyncGenerator<O>;
};
