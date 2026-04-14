import SerializationService from '@/application/services/SerializationService.ts';
import { GamePlayer, GameTurnGenerator } from '@/application/types/index.ts';
import { WorkerResponseType } from '@/infrastructure/services/WebWorkerService.ts';

const serializationService = new SerializationService();

self.onmessage = (e: MessageEvent<{ input: unknown; type: string }>) => {
  try {
    const { data, player } = e.data.input as { data: unknown; player: GamePlayer };
    const context = serializationService.hydrate(data);
    for (const result of GameTurnGenerator.execute(context, player)) {
      self.postMessage({ type: WorkerResponseType.Result, value: result });
    }
    self.postMessage({ type: WorkerResponseType.Done });
  } catch (error) {
    self.postMessage({ error: String(error), type: WorkerResponseType.Error });
  }
};
