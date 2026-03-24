import { Player as DomainPlayer, Event as DomainEvent, Letter as DomainLetter } from '@/domain/enums.ts';
import type { default as Domain } from '@/domain/index.ts';
import { Bonus as DomainBonus } from '@/domain/models/Board.ts';
import type { CellIndex as DomainCell } from '@/domain/models/Board.ts';
import { default as DomainDictionary } from '@/domain/models/Dictionary.ts';
import type { DictionaryProps as DomainDictionaryProps } from '@/domain/models/Dictionary.ts';
import type { TileId as DomainTile } from '@/domain/models/Inventory.ts';
import { MatchResult as DomainMatchResult } from '@/domain/models/MatchTracker.ts';
import { ResolutionType as DomainTurnResolutionType } from '@/domain/models/TurnTracker.ts';
import type { Resolution as DomainTurnResolution } from '@/domain/models/TurnTracker.ts';

export type { Domain, DomainCell, DomainDictionaryProps, DomainTile, DomainTurnResolution };
export {
  DomainPlayer,
  DomainEvent,
  DomainLetter,
  DomainBonus,
  DomainDictionary,
  DomainMatchResult,
  DomainTurnResolutionType,
};

export type DomainConfig = {
  readonly boardCells: ReadonlyArray<DomainCell>;
};

export type DomainState = {
  currentPlayer: DomainPlayer;
  nextPlayer: DomainPlayer;
  currentTurnCells?: ReadonlyArray<DomainCell>;
  currentTurnScore?: number;
  currentTurnWords?: ReadonlyArray<string>;
  currentTurnIsValid: boolean;
  currentTurnTiles: ReadonlyArray<DomainTile>;
  previousTurnTiles?: ReadonlyArray<DomainTile>;
  hasPriorTurns: boolean;
  turnResolutionHistory: ReadonlyArray<DomainTurnResolution>;
  unusedTilesCount: number;
  matchIsFinished: boolean;
};
