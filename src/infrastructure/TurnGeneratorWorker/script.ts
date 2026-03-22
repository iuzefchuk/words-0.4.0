import TurnGenerator from '@/domain/services/TurnGenerator.ts';
import Domain from '@/domain/index.ts';
import { TurnGeneratorWorkerRequest } from './TurnGeneratorWorker.ts';

self.onmessage = (event: MessageEvent<TurnGeneratorWorkerRequest>) => {
  try {
    const { context, player } = event.data;
    if (!context?.board || !context?.dictionary || !context?.inventory || !context?.game || !player) {
      throw new Error('Invalid worker request: missing context fields or player');
    }
    Domain.hydrate(context.game);
    for (const result of TurnGenerator.execute(context, player)) return self.postMessage({ return: result });
    self.postMessage({ return: null });
  } catch (error) {
    self.postMessage({ return: null, error: error instanceof Error ? error.message : String(error) });
  }
};
