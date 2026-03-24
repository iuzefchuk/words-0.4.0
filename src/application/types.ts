import type {
  DomainCell,
  DomainTile,
  DomainConfig,
  DomainTurnResolution,
  DomainDictionaryProps,
} from '@/domain/types.ts';
import {
  DomainBonus,
  DomainEvent,
  DomainLetter,
  DomainPlayer,
  DomainMatchResult,
  DomainDictionary,
} from '@/domain/types.ts';
import { IdGenerator, Clock, TurnGenerationWorker } from '@/shared/ports.ts';

export type { DomainCell, DomainTile, DomainTurnResolution, DomainDictionaryProps };
export { DomainBonus, DomainEvent, DomainLetter, DomainPlayer, DomainMatchResult, DomainDictionary };

export type AppConfig = DomainConfig;

export type AppState = {
  tilesRemaining: number;
  matchIsFinished: boolean;
  currentPlayerIsUser: boolean;
  currentTurnScore?: number;
  currentTurnIsValid: boolean;
  userScore: number;
  opponentScore: number;
  userPassWillBeResign: boolean;
  userTiles: ReadonlyArray<DomainTile>;
  turnResolutionHistory: ReadonlyArray<AppTurnResolution>;
  matchResult?: DomainMatchResult;
};

export type AppDependencies = {
  dictionary: DomainDictionary;
  idGenerator: IdGenerator;
  turnGenerationWorker: TurnGenerationWorker<DomainPlayer, DomainCell, DomainTile>;
  clock: Clock;
};

export type AppTurnResponse = Result<{ words: ReadonlyArray<string> }, string>;

export type AppTurnResolution = { isSave: boolean; isUser: boolean; words?: string; score?: number };
