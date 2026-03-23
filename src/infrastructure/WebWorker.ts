import { TIME } from '@/shared/constants.ts';

export default class WebWorker<Request, Response> {
  private static readonly TIMEOUT_MS = TIME.ms_in_second * 15;
  private readonly worker: Worker;

  private constructor(worker: Worker) {
    this.worker = worker;
  }

  static create<Request, Response>(pathToSrc: string): WebWorker<Request, Response> {
    const worker = new Worker(new URL(pathToSrc, import.meta.url), { type: 'module' });
    return new WebWorker(worker);
  }

  execute(request: Request): Promise<Response | null> {
    const work = new Promise<Response | null>((resolve, reject) => {
      this.worker.onmessage = (event: MessageEvent<{ return: Response | null }>) => resolve(event.data.return);
      this.worker.onerror = (event: ErrorEvent) => {
        event.preventDefault();
        reject(new Error(`Worker error: ${event.message}`));
      };
      this.worker.postMessage(request);
    });
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Worker timed out')), WebWorker.TIMEOUT_MS),
    );
    return Promise.race([work, timeout]);
  }

  terminate(): void {
    this.worker.terminate();
  }
}
