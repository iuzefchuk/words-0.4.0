import { GameEvent, GameTrie } from '@/application/types/index.ts';

export type DictionaryRepository = {
  load(): Promise<GameTrie | null>;
  save(trie: GameTrie): Promise<void>;
};

export type EventRepository = {
  delete(): Promise<void>;
  load(): Promise<null | ReadonlyArray<GameEvent>>;
  save(events: ReadonlyArray<GameEvent>): Promise<void>;
};
