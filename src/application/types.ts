import { DomainTile } from '@/domain/types.ts';
import { AppMatchResult } from '@/application/enums.ts';

export {
  DomainPlayer as AppPlayer,
  DomainLetter as AppLetter,
  DomainBonus as AppBonus,
  DomainTurnOutcomeType as AppTurnOutcomeType,
  DomainDictionary as AppDictionary,
} from '@/domain/types.ts';
export type {
  Domain as AppDomain,
  DomainCell as AppCell,
  DomainTile as AppTile,
  DomainTurnResult as AppTurnResult,
  DomainTurnOutcome as AppTurnOutcome,
  DomainDictionaryCache as AppDictionaryCache,
} from '@/domain/types.ts';

export type AppState = {
  isFinished: boolean;
  matchResult?: AppMatchResult;
  tilesRemaining: number;
  userTiles: ReadonlyArray<DomainTile>;
  currentTurnScore?: number;
  userScore: number;
  opponentScore: number;
  currentTurnIsValid: boolean;
  currentPlayerIsUser: boolean;
  userPassWillBeResign: boolean;
};

export type AppTurnOutcomeHistory = ReadonlyArray<{ isSave: boolean; isUser: boolean; words?: string; score?: number }>;
