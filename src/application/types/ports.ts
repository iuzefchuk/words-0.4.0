export type { IdentifierGateway, RandomizerGateway } from '@/domain/types/ports.ts';

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

export type BootProgressPublisher = {
  publish(progress: number): void;
  subscribe(handler: (progress: number) => void): void;
};

export type LoaderGateway = {
  load(url: string): Promise<ArrayBufferLike>;
};

export type SchedulerGateway = {
  padTo<T>(minimumMs: number, callback: () => Promise<T> | T): Promise<T>;
  yield(): Promise<void>;
};

export type WorkerGateway = {
  getPoolSize(taskId: string): number;
  init(taskId: string, data: unknown): Promise<void>;
  stream<O>(taskId: string, data: unknown): AsyncGenerator<O>;
  streamParallel<O>(taskId: string, inputs: ReadonlyArray<unknown>): AsyncGenerator<O>;
};

export type WorkerRequest = { input: unknown; type: WorkerRequestType };

export type WorkerResponse =
  | { error: string; type: WorkerResponseType.Error }
  | { type: WorkerResponseType.Done }
  | { type: WorkerResponseType.Ready }
  | { type: WorkerResponseType.Result; value: unknown };
