import { RandomizerGateway } from '@/application/types/ports.ts';

export default class Mulberry32RandomizerGateway {
  static createFunctionFromSeed(seed: number): () => number {
    let state = seed | 0;
    return () => {
      state = (state + 0x6d2b79f5) | 0;
      let hash = Math.imul(state ^ (state >>> 15), 1 | state);
      hash = (hash + Math.imul(hash ^ (hash >>> 7), 61 | hash)) ^ hash;
      return ((hash ^ (hash >>> 14)) >>> 0) / 4294967296;
    };
  }

  static createNewSeed(): number {
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      return crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
    }
    return Math.floor(Math.random() * 0x100000000);
  }
}

Mulberry32RandomizerGateway satisfies RandomizerGateway;
