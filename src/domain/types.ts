import { ValidationStatus, ValidationErrors } from '@/domain/enums.ts';
import { CellIndex } from '@/domain/reference/Layout/types.ts';
import { TileId } from '@/domain/model/Inventory/types.ts';
import TurnPlacement from '@/domain/model/Turn/TurnPlacement.ts';

export { default as Placement } from '@/domain/model/Turn/TurnPlacement.ts';
export type { Link } from '@/domain/model/Turn/TurnPlacement.ts';

type ComputedSequences = { sequences: { cell: ReadonlyArray<CellIndex>; tile: ReadonlyArray<TileId> } };
type ComputedPlacements = { placements: ReadonlyArray<TurnPlacement> };
type ComputedWords = { words: ReadonlyArray<string> };
type ComputedScore = { score: number };

export type ComputedValue = ComputedSequences | ComputedPlacements | ComputedWords | ComputedScore;

export type UnvalidatedResult = { status: ValidationStatus.Unvalidated };
export type InvalidResult = { status: ValidationStatus.Invalid; error: ValidationErrors };
export type ValidResult = { status: ValidationStatus.Valid } & ComputedSequences &
  ComputedPlacements &
  ComputedWords &
  ComputedScore;
export type ValidationResult = UnvalidatedResult | InvalidResult | ValidResult;
