import { WorkerResponseType } from '@/infrastructure/services/WebWorkerService.ts';

self.onmessage = (e: MessageEvent<{ input: unknown; type: string }>) => {
  try {
    const array = JSON.parse(e.data.input as string);
    self.postMessage({ type: WorkerResponseType.Result, value: array });
  } catch (error) {
    self.postMessage({ error: String(error), type: WorkerResponseType.Error });
  }
};
