import { GameContext } from '@/domain/types.ts';
import { ValidationErrors, ValidationStatus } from '@/domain/Turnkeeper/enums.ts';
import { TileId } from '@/domain/Inventory/types/shared.ts';
import { CellIndex } from '@/domain/Layout/types/shared.ts';
import { Placement } from '@/domain/Turnkeeper/types/shared.ts';

export type UnvalidatedResult = { status: ValidationStatus.Unvalidated };
export type PendingResult<Context> = { status: ValidationStatus.Pending; ctx: Context };
export type InvalidResult = { status: ValidationStatus.Invalid; error: ValidationErrors };
export type ValidResult = { status: ValidationStatus.Valid } & Computeds;
export type StepResult<Context> = PendingResult<Context> | InvalidResult;
export type FinalResult = InvalidResult | ValidResult;
export type ValidationResult = UnvalidatedResult | InvalidResult | ValidResult;

export type InitialContext = { initialPlacement: Placement; gameContext: GameContext };
export type SequencesContext = InitialContext & ComputedSequences;
export type PlacementsContext = SequencesContext & ComputedPlacements;
export type WordsContext = PlacementsContext & ComputedWords;
export type ScoreContext = WordsContext & ComputedScore;
export type PipelineContext = InitialContext | SequencesContext | PlacementsContext | WordsContext | ScoreContext;

type ComputedSequences = { sequences: { cell: ReadonlyArray<CellIndex>; tile: ReadonlyArray<TileId> } };
type ComputedPlacements = { placements: ReadonlyArray<Placement> };
type ComputedWords = { words: ReadonlyArray<string> };
type ComputedScore = { score: number };
type Computeds = ComputedSequences & ComputedPlacements & ComputedWords & ComputedScore;
