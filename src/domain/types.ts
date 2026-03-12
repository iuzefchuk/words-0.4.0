import { ValidationStatus, ValidationErrors } from '@/domain/enums.ts';
import { Board } from '@/domain/model/Board/types.ts';
import { Dictionary } from '@/domain/reference/Dictionary/types.ts';
import { Inventory } from '@/domain/model/Inventory/types.ts';
import { Turnkeeper } from '@/domain/model/Turn/types.ts';
import { CellIndex } from '@/domain/reference/Layout/types.ts';
import { TileId } from '@/domain/model/Inventory/types.ts';
import Placement from '@/domain/model/Placement.ts';

export type GameContext = {
  board: Board;
  dictionary: Dictionary;
  inventory: Inventory;
  turnkeeper: Turnkeeper;
};

export { default as Placement } from '@/domain/model/Placement.ts';
export type { Link } from '@/domain/model/Placement.ts';

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
