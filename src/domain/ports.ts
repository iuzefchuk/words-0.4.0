import type { DictionarySnapshot } from '@/domain/models/Dictionary.ts';
import type { GameSnapshot } from '@/domain/types.ts';

export type DictionaryRepository = {
  load(): Promise<DictionarySnapshot | null>;
  save(snapshot: DictionarySnapshot): Promise<void>;
};

export type GameRepository = {
  delete(): Promise<void>;
  load(): Promise<GameSnapshot | null>;
  save(snapshot: GameSnapshot): Promise<void>;
};

export type IdGenerator = {
  execute(): string;
};
