import { Player } from '@/domain/enums.ts';
import { MatchResult } from '@/domain/models/match/enums.ts';

export type MatchView = {
  getResultFor(player: Player): MatchResult;
  getScoreFor(player: Player): number;
  readonly isFinished: boolean;
};
