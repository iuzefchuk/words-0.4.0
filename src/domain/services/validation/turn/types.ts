import { GameValidationStatus } from '@/domain/enums.ts';
import Board from '@/domain/models/board/Board.ts';
import Dictionary from '@/domain/models/dictionary/Dictionary.ts';
import Inventory from '@/domain/models/inventory/Inventory.ts';
import Turns from '@/domain/models/turns/Turns.ts';
import {
  GameComputedCells,
  GameComputedPlacements,
  GameComputedScore,
  GameComputedValue,
  GameComputedWords,
  GameInvalidResult,
  GameValidResult,
} from '@/domain/types/index.ts';

export type ComputedTilesOutput = GameComputedPlacements & SequencesOutput;

export type PendingResult<State> = { state: State; status: GameValidationStatus.Pending };

export type PipelineInput = { context: ValidatorContext };

export type PipelineOutput = GameInvalidResult | GameValidResult;

export type PipelineState<Output extends GameComputedValue> = Output & PipelineInput;

export type PipelineThroughput<State> = GameInvalidResult | PendingResult<State>;

export type ScoreOutput = GameComputedScore & WordsOutput;

export type SequencesOutput = GameComputedCells;

export type ValidatorContext = { board: Board; dictionary: Dictionary; inventory: Inventory; turns: Turns };

export type WordsOutput = ComputedTilesOutput & GameComputedWords;
