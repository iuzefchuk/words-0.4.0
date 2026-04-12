import Board from '@/domain/models/board/Board.ts';
import Dictionary from '@/domain/models/dictionary/Dictionary.ts';
import Inventory from '@/domain/models/inventory/Inventory.ts';
import { ValidationStatus } from '@/domain/models/turns/enums.ts';
import Turns from '@/domain/models/turns/Turns.ts';
import {
  ComputedCells,
  ComputedPlacements,
  ComputedScore,
  ComputedValue,
  ComputedWords,
  InvalidResult,
  ValidResult,
} from '@/domain/models/turns/types.ts';

export type ComputedTilesOutput = ComputedPlacements & SequencesOutput;

export type PendingResult<State> = { state: State; status: ValidationStatus.Pending };

export type PipelineInput = { context: ValidatorContext };

export type PipelineOutput = InvalidResult | ValidResult;

export type PipelineState<Output extends ComputedValue> = Output & PipelineInput;

export type PipelineThroughput<State> = InvalidResult | PendingResult<State>;

export type ScoreOutput = ComputedScore & WordsOutput;

export type SequencesOutput = ComputedCells;

export type ValidatorContext = { board: Board; dictionary: Dictionary; inventory: Inventory; turns: Turns };

export type WordsOutput = ComputedTilesOutput & ComputedWords;
