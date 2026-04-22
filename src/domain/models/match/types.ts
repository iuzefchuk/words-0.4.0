import { Player } from '@/domain/enums.ts';
import { Difficulty, MatchResult, MatchType } from '@/domain/models/match/enums.ts';

export type MatchSettings = {
  difficulty: Difficulty;
  matchType: MatchType;
};

export type MatchView = {
  readonly difficulty: Difficulty;
  getResultFor(player: Player): MatchResult;
  getScoreFor(player: Player): number;
  readonly isFinished: boolean;
  readonly matchType: MatchType;
};
