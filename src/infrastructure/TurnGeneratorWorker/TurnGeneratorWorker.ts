import { TurnGeneratorResult } from '@/application/services/TurnGenerator.ts';
import { GameContext } from '@/application/Game.ts';
import { Player } from '@/domain/enums.ts';

export type TurnGeneratorWorkerRequest = { context: GameContext; player: Player };

export default class TurnGeneratorWorker {
  private readonly worker: Worker = new Worker(new URL('./script.ts', import.meta.url), { type: 'module' });

  execute(request: TurnGeneratorWorkerRequest): Promise<TurnGeneratorResult | null> {
    return new Promise(resolve => {
      this.worker.onmessage = (event: MessageEvent<{ return: TurnGeneratorResult | null }>) =>
        resolve(event.data.return);
      this.worker.postMessage(request);
    });
  }

  terminate(): void {
    this.worker.terminate();
  }
}
