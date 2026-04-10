import { Player } from '@/domain/enums.ts';
import { Cell, Placement } from '@/domain/models/board/types.ts';
import { Tile } from '@/domain/models/inventory/types.ts';
import { ValidationError, ValidationStatus } from '@/domain/models/turns/enums.ts';

export type AllComputeds = ComputedCells & ComputedPlacements & ComputedScore & ComputedWords;

export type ComputedCells = { cells: ReadonlyArray<Cell> };

export type ComputedPlacements = { placements: ReadonlyArray<Placement> };

export type ComputedScore = { score: number };

export type ComputedValue = ComputedCells | ComputedPlacements | ComputedScore | ComputedWords;

export type ComputedWords = { words: ReadonlyArray<string> };

export type InvalidResult = { error: ValidationError; status: ValidationStatus.Invalid };

export type TurnsView = {
  readonly currentPlayer: Player;
  readonly currentTurnCells: ReadonlyArray<Cell> | undefined;
  readonly currentTurnIsValid: boolean;
  readonly currentTurnScore: number | undefined;
  readonly currentTurnTiles: ReadonlyArray<Tile>;
  readonly currentTurnWords: ReadonlyArray<string> | undefined;
  readonly historyHasPriorTurns: boolean;
  readonly nextPlayer: Player;
  readonly previousTurnTiles: ReadonlyArray<Tile> | undefined;
};

export type UnvalidatedResult = { status: ValidationStatus.Unvalidated };

export type ValidationResult = InvalidResult | UnvalidatedResult | ValidResult;

export type ValidResult = { status: ValidationStatus.Valid } & AllComputeds;
