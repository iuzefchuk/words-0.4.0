import TurnGenerator from '@/domain/services/TurnGenerator.ts';
import Domain from '@/domain/index.ts';
import { Player } from '@/domain/enums.ts';

type WorkerRequest = { domain: Domain; player: Player };

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  try {
    const { domain, player } = event.data;
    if (!domain || !player) {
      throw new Error('Invalid worker request: missing domain or player');
    }
    const hydrated = Domain.hydrate(domain);
    for (const result of TurnGenerator.execute(hydrated.toGeneratorContext(), player)) {
      return self.postMessage({ return: result });
    }
    self.postMessage({ return: null });
  } catch (error) {
    self.postMessage({ return: null, error: error instanceof Error ? error.message : String(error) });
  }
};
