import { GeneratorResult } from '@/domain/services/TurnGenerator.ts';
import { Domain } from '@/domain/types.ts';
import { AppPlayer } from '@/application/types.ts';
import { TIME } from '@/shared/constants.ts';

export type TurnGeneratorWorkerRequest = { domain: Domain; player: AppPlayer };

export default class TurnGeneratorWorker {
  private static readonly TIMEOUT_MS = TIME.ms_in_second * 10;

  private readonly worker: Worker = new Worker(new URL('./script.ts', import.meta.url), { type: 'module' });

  execute(request: TurnGeneratorWorkerRequest): Promise<GeneratorResult | null> {
    const work = new Promise<GeneratorResult | null>((resolve, reject) => {
      this.worker.onmessage = (event: MessageEvent<{ return: GeneratorResult | null }>) => resolve(event.data.return);
      this.worker.onerror = (event: ErrorEvent) => {
        event.preventDefault();
        reject(new Error(`Worker error: ${event.message}`));
      };
      this.worker.postMessage(request);
    });
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Worker timed out')), TurnGeneratorWorker.TIMEOUT_MS),
    );
    return Promise.race([work, timeout]);
  }

  terminate(): void {
    this.worker.terminate();
  }
}
