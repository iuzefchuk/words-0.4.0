import { Player as DomainPlayer, Event as DomainEvent, Letter as DomainLetter } from '@/domain/enums.ts';
import type { default as Domain } from '@/domain/index.ts';
import { Bonus as DomainBonus } from '@/domain/models/Board.ts';
import { CellIndex as DomainCell } from '@/domain/models/Board.ts';
import { default as DomainDictionary, DictionaryProps as DomainDictionaryProps } from '@/domain/models/Dictionary.ts';
import { TileId as DomainTile } from '@/domain/models/Inventory.ts';
import { MatchResult as DomainMatchResult } from '@/domain/models/MatchTracker.ts';
import {
  Resolution as DomainTurnResolution,
  ResolutionType as DomainTurnResolutionType,
} from '@/domain/models/TurnTracker.ts';

export {
  DomainPlayer,
  DomainEvent,
  Domain,
  DomainLetter,
  DomainBonus,
  DomainCell,
  DomainDictionary,
  DomainDictionaryProps,
  DomainTile,
  DomainMatchResult,
  DomainTurnResolution,
  DomainTurnResolutionType,
};

export type DomainConfig = {
  readonly bonuses: typeof DomainBonus;
  readonly letters: typeof DomainLetter;
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
