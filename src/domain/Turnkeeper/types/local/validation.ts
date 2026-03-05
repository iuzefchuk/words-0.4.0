import { GameContext } from '@/domain/types.ts';
import { ValidationErrors as Errors, ValidationResultType as ResultType } from '@/domain/Turnkeeper/enums.ts';
import { TileId } from '@/domain/Inventory/types/shared.ts';
import { CellIndex } from '@/domain/Layout/types/shared.ts';
import { Placement } from '@/domain/Turnkeeper/types/shared.ts';

// TODO revisit naming

export type UnvalidatedValidationResult = { type: ResultType.Unvalidated };
export type InvalidValidationResult = { type: ResultType.Invalid; error: string };
export type ValidValidationResult = { type: ResultType.Valid } & ValidationComputeds;
export type ValidationResult = UnvalidatedValidationResult | InvalidValidationResult | ValidValidationResult;

export type ValidationComputeds = {
  sequences: { cell: ReadonlyArray<CellIndex>; tile: ReadonlyArray<TileId> };
  score: number;
  words: ReadonlyArray<string>;
};

export type BaseContext = { initialPlacement: Placement; gameContext: GameContext };
export type SequencesContext = BaseContext & {
  sequences: { cell: ReadonlyArray<CellIndex>; tile: ReadonlyArray<TileId> };
};
export type PlacementsContext = SequencesContext & { placements: ReadonlyArray<Placement> };
export type WordsContext = PlacementsContext & { words: ReadonlyArray<string> };
export type ScoreContext = WordsContext & { score: number };

export type PipelineResult<Context> = ValidPipelineResult<Context> | InvalidPipelineResult;
export type ValidPipelineResult<Context> = { isValid: true; ctx: Context };
export type InvalidPipelineResult = { isValid: false; error: Errors };
