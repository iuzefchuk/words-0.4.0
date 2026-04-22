import { GamePlayer } from '@/domain/enums.ts';
import { Difficulty, Result, Type } from '@/domain/models/match/enums.ts';

export type MatchSettings = {
  difficulty: Difficulty;
  type: Type;
};

export type MatchView = {
  getResultFor(player: GamePlayer): Result;
  getScoreFor(player: GamePlayer): number;
  readonly isFinished: boolean;
  readonly settings: MatchSettings;
};
