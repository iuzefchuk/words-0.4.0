import { GameContext } from '@/domain/types.ts';
import { ValidationErrors, ValidationStatus } from '@/domain/Turnkeeper/enums.ts';
import { TileId } from '@/domain/Inventory/types/shared.ts';
import { CellIndex } from '@/domain/Layout/types/shared.ts';
import { Placement } from '@/domain/Turnkeeper/types/shared.ts';

export type Arguments = { initialPlacement: Placement; context: GameContext };

type ComputedSequences = { sequences: { cell: ReadonlyArray<CellIndex>; tile: ReadonlyArray<TileId> } };
type ComputedPlacements = { placements: ReadonlyArray<Placement> };
type ComputedWords = { words: ReadonlyArray<string> };
type ComputedScore = { score: number };
type Computeds = ComputedSequences & ComputedPlacements & ComputedWords & ComputedScore;
export type ComputedValue = ComputedSequences | ComputedPlacements | ComputedWords | ComputedScore;

export type UnvalidatedResult = { status: ValidationStatus.Unvalidated };
export type PendingResult<State> = { status: ValidationStatus.Pending; state: State };
export type InvalidResult = { status: ValidationStatus.Invalid; error: ValidationErrors };
export type ValidResult = { status: ValidationStatus.Valid } & Computeds;
export type Result = UnvalidatedResult | InvalidResult | ValidResult;

export type PipelineInput = Arguments;
export type PipelineThroughput<State> = PendingResult<State> | InvalidResult;
export type PipelineState<Output extends ComputedValue> = PipelineInput & Output;
export type PipelineOutput = InvalidResult | ValidResult;

export type SequencesOutput = ComputedSequences;
export type PlacementsOutput = SequencesOutput & ComputedPlacements;
export type WordsOutput = PlacementsOutput & ComputedWords;
export type ScoreOutput = WordsOutput & ComputedScore;
