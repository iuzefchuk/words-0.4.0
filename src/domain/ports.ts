import type { GameSnapshot } from '@/domain/types.ts';

export type GameRepository = {
  save(snapshot: GameSnapshot): Promise<void>;
  load(): Promise<GameSnapshot | null>;
  clear(): Promise<void>;
};

export type IdGenerator = {
  execute(): string;
};
