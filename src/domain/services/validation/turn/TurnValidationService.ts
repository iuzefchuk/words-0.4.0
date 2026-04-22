import { GameValidationError, GameValidationStatus } from '@/domain/enums.ts';
import ScoringService from '@/domain/services/scoring/ScoringService.ts';
import CellsValidationService from '@/domain/services/validation/cells/CellsValidationService.ts';
import PlacementsValidationService from '@/domain/services/validation/placements/PlacementsValidationService.ts';
import {
  ComputedTilesOutput,
  PendingResult,
  PipelineInput,
  PipelineOutput,
  PipelineState,
  PipelineThroughput,
  ScoreOutput,
  SequencesOutput,
  ValidatorContext,
  WordsOutput,
} from '@/domain/services/validation/turn/types.ts';
import WordsValidationService from '@/domain/services/validation/words/WordsValidationService.ts';
import { GameComputedValue, GameInvalidResult, GameValidationResult } from '@/domain/types/index.ts';

class Pipeline<State extends PipelineInput> {
  private constructor(private throughput: PipelineThroughput<State>) {}

  static fail(error: GameValidationError): GameInvalidResult {
    return { error, status: GameValidationStatus.Invalid };
  }

  static pass<State extends PipelineInput, NewValue extends GameComputedValue>(
    state: State,
    newValue: NewValue,
  ): PendingResult<NewValue & State> {
    Object.assign(state, newValue);
    return { state: state as NewValue & State, status: GameValidationStatus.Pending };
  }

  static start(context: ValidatorContext): Pipeline<PipelineInput> {
    return new Pipeline({ state: { context }, status: GameValidationStatus.Pending });
  }

  continue<NextState extends State>(callback: (state: State) => PipelineThroughput<NextState>): Pipeline<NextState> {
    if (this.throughput.status === GameValidationStatus.Pending) this.throughput = callback(this.throughput.state);
    return this as unknown as Pipeline<NextState>;
  }

  end(): PipelineOutput {
    if (this.throughput.status === GameValidationStatus.Invalid) return this.throughput;
    const { cells, placements, score, words } = this.throughput.state as unknown as PipelineState<ScoreOutput>;
    return { cells, placements, score, status: GameValidationStatus.Valid, words };
  }
}

export default class TurnValidationService {
  static execute(context: ValidatorContext): GameValidationResult {
    return Pipeline.start(context)
      .continue(state => this.validateCells(state))
      .continue(state => this.validatePlacements(state))
      .continue(state => this.validateWords(state))
      .continue(state => this.computeScore(state))
      .end();
  }

  private static computeScore(state: PipelineState<WordsOutput>): PipelineThroughput<PipelineState<ScoreOutput>> {
    const { board, inventory } = state.context;
    const newCells = new Set(state.cells);
    const score = ScoringService.execute(
      state.placements,
      newCells,
      tile => inventory.getTilePoints(tile),
      cell => board.getMultiplierForLetter(cell),
      cell => board.getMultiplierForWord(cell),
    );
    return Pipeline.pass(state, { score });
  }

  private static isError(result: unknown): result is GameValidationError {
    return typeof result === 'string';
  }

  private static validateCells(state: PipelineInput): PipelineThroughput<PipelineState<SequencesOutput>> {
    const { board, turns } = state.context;
    const result = CellsValidationService.execute(
      turns.currentTurnTiles,
      turns.historyHasPriorTurns,
      tiles => board.resolvePlacement(tiles),
      cell => board.isCellCenter(cell),
      cell => board.getAdjacentCells(cell),
      cell => board.isCellOccupied(cell),
    );
    if (this.isError(result)) return Pipeline.fail(result);
    return Pipeline.pass(state, { cells: result });
  }

  private static validatePlacements(
    state: PipelineState<SequencesOutput>,
  ): PipelineThroughput<PipelineState<ComputedTilesOutput>> {
    const { board, turns } = state.context;
    const result = PlacementsValidationService.execute(
      turns.currentTurnTiles,
      state.cells,
      cells => board.calculateAxis(cells),
      (coords, tiles) => board.createPlacement(coords, tiles),
      axis => board.getOppositeAxis(axis),
      cell => board.findTileByCell(cell),
    );
    if (this.isError(result)) return Pipeline.fail(result);
    return Pipeline.pass(state, { placements: result });
  }

  private static validateWords(state: PipelineState<ComputedTilesOutput>): PipelineThroughput<PipelineState<WordsOutput>> {
    const { dictionary, inventory } = state.context;
    const result = WordsValidationService.execute(
      state.placements,
      tile => inventory.getTileLetter(tile),
      words => dictionary.containsAllWords(words),
    );
    if (this.isError(result)) return Pipeline.fail(result);
    return Pipeline.pass(state, { words: result });
  }
}
