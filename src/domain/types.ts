import { ValidationStatus, ValidationErrors } from '@/domain/enums.ts';
import { Board } from '@/domain/Board/types.ts';
import { Dictionary } from '@/domain/Dictionary/types.ts';
import { Inventory } from '@/domain/Inventory/types.ts';
import { Turnkeeper } from '@/domain/Turn/types.ts';
import { CellIndex } from '@/domain/Board/types.ts';
import { TileId } from '@/domain/Inventory/types.ts';

export type GameContext = {
  board: Board;
  dictionary: Dictionary;
  inventory: Inventory;
  turnkeeper: Turnkeeper;
};

export type Link = { readonly cell: CellIndex; readonly tile: TileId };

export type Placement = Array<Link>;

// Validation result types (shared between state and rules layers)

type ComputedSequences = { sequences: { cell: ReadonlyArray<CellIndex>; tile: ReadonlyArray<TileId> } };
type ComputedPlacements = { placements: ReadonlyArray<Placement> };
type ComputedWords = { words: ReadonlyArray<string> };
type ComputedScore = { score: number };

export type ComputedValue = ComputedSequences | ComputedPlacements | ComputedWords | ComputedScore;

export type UnvalidatedResult = { status: ValidationStatus.Unvalidated };
export type InvalidResult = { status: ValidationStatus.Invalid; error: ValidationErrors };
export type ValidResult = { status: ValidationStatus.Valid } & ComputedSequences & ComputedPlacements & ComputedWords & ComputedScore;
export type ValidationResult = UnvalidatedResult | InvalidResult | ValidResult;
