import { DomainPlayer } from '@/application/types.ts';
import Domain from '@/domain/index.ts';

self.onmessage = (event: MessageEvent<{ domain: unknown; player: DomainPlayer }>) => {
  try {
    const { domain, player } = event.data;
    if (!domain || !player) {
      throw new Error('Invalid worker request: missing domain or player');
    }
    const reconstructed = Domain.reconstruct(domain);
    for (const result of reconstructed.generateTurnFor(player)) {
      return self.postMessage({ return: result });
    }
    self.postMessage({ return: null });
  } catch (error) {
    self.postMessage({ return: null, error: error instanceof Error ? error.message : String(error) });
  }
};
