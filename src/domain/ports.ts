import type { DictionarySnapshot } from '@/domain/models/Dictionary.ts';
import type { GameSnapshot } from '@/domain/types.ts';

export type GameRepository = {
  save(snapshot: GameSnapshot): Promise<void>;
  load(): Promise<GameSnapshot | null>;
  delete(): Promise<void>;
};

export type DictionaryRepository = {
  save(snapshot: DictionarySnapshot): Promise<void>;
  load(): Promise<DictionarySnapshot | null>;
};

export type IdGenerator = {
  execute(): string;
};
