import type {
  DomainCell,
  DomainTile,
  DomainConfig,
  DomainTurnResolution,
  DomainMatchResult,
  DomainDictionaryProps,
} from '@/domain/types.ts';
import { DomainPlayer, DomainDictionary } from '@/domain/types.ts';
import { IdGenerator, Clock, TurnGenerationWorker } from '@/shared/ports.ts';

export type { DomainCell, DomainTile, DomainDictionaryProps };
export { DomainPlayer, DomainDictionary };

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
  turnResolutionHistory: ReadonlyArray<DomainTurnResolution>;
  matchResult?: DomainMatchResult;
};

export type AppDependencies = {
  dictionary: DomainDictionary;
  idGenerator: IdGenerator;
  turnGenerationWorker: TurnGenerationWorker<DomainPlayer, DomainCell, DomainTile>;
  clock: Clock;
};

export type AppTurnResponse = Result<{ words: ReadonlyArray<string> }, string>;
