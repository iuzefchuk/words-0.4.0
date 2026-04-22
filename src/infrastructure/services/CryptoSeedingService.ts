import { SeedingService } from '@/application/types/ports.ts';

export default class CryptoSeedingService implements SeedingService {
  createRandomizer(seed: number): () => number {
    let state = seed | 0;
    return () => {
      state = (state + 0x6d2b79f5) | 0;
      let hash = Math.imul(state ^ (state >>> 15), 1 | state);
      hash = (hash + Math.imul(hash ^ (hash >>> 7), 61 | hash)) ^ hash;
      return ((hash ^ (hash >>> 14)) >>> 0) / 4294967296;
    };
  }

  createSeed(): number {
    const value = crypto.getRandomValues(new Uint32Array(1))[0];
    if (value === undefined) throw new ReferenceError('expected random value, got undefined');
    return value;
  }
}
