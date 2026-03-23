import { MatchResult } from '@/application/enums.ts';
import { IdGenerator, Clock, TurnGenerationWorker, SoundPlayer } from '@/shared/ports.ts';
import { Sound } from '@/application/enums.ts';
import { DomainDictionary, DomainPlayer, DomainCell, DomainTile } from '@/domain/types.ts';

export { DomainEvent } from '@/domain/types.ts';

export {
  DomainPlayer as AppPlayer,
  DomainLetter as AppLetter,
  DomainBonus as AppBonus,
  DomainTurnResolutionType as AppTurnResolutionType,
  DomainDictionary as AppDictionary,
} from '@/domain/types.ts';

export type {
  Domain as AppDomain,
  DomainCell as AppCell,
  DomainTile as AppTile,
  DomainTurnResolution as AppTurnResolution,
  DomainDictionaryProps as AppDictionaryProps,
} from '@/domain/types.ts';

export type AppState = {
  isFinished: boolean;
  matchResult?: MatchResult;
  tilesRemaining: number;
  userTiles: ReadonlyArray<DomainTile>;
  currentTurnScore?: number;
  userScore: number;
  opponentScore: number;
  currentTurnIsValid: boolean;
  currentPlayerIsUser: boolean;
  userPassWillBeResign: boolean;
};

export type AppTurnResolutionHistory = ReadonlyArray<{
  isSave: boolean;
  isUser: boolean;
  words?: string;
  score?: number;
}>;

export type AppDependencies = {
  dictionary: DomainDictionary;
  idGenerator: IdGenerator;
  clock: Clock;
  turnGenerationWorker: TurnGenerationWorker<DomainPlayer, DomainTile, DomainCell>;
  soundPlayer: SoundPlayer<Sound>;
};

export type AppTurnExecutionResult = Result<{ words: ReadonlyArray<string> }, string>;