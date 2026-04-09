import { SeedingService } from '@/domain/types.ts';

export default class CryptoSeedingService implements SeedingService {
  createRandomizer(seed: number): () => number {
    let state = seed | 0;
    return () => {
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  createSeed(): number {
    return crypto.getRandomValues(new Uint32Array(1))[0]!;
  }
}
