import { Placement, ComputedValue, ValidationResult, ValidResult, InvalidResult } from '@/domain/types.ts';
import { ValidationErrors, ValidationStatus } from '@/domain/enums.ts';
import { GameContext } from '@/application/types.ts';
import AxisCalculator from '@/domain/rules/AxisCalculator.ts';
import PlacementBuilder from '@/domain/rules/PlacementBuilder.ts';
import ScoreComputer from '@/domain/rules/ScoreComputer.ts';
import {
  ValidatorArguments,
  PendingResult,
  PipelineInput,
  PipelineState,
  PipelineThroughput,
  PipelineOutput,
  SequencesOutput,
  PlacementsOutput,
  WordsOutput,
  ScoreOutput,
} from '@/application/services/validation/types.ts';
import { AnchorCoordinates } from '@/domain/reference/Layout/types.ts';

export default class TurnValidator {
  static execute(context: GameContext, initialPlacement: Placement): ValidationResult {
    const args: ValidatorArguments = { initialPlacement };
    return this.Pipeline.start(context, args)
      .continue(state => this.computeAndValidateSequences(state))
      .continue(state => this.computeAndValidatePlacements(state))
      .continue(state => this.computeAndValidateWords(state))
      .continue(state => this.computeAndValidateScore(state))
      .end();
  }

  private static Pipeline = class Pipeline<State extends PipelineInput> {
    private constructor(private throughput: PipelineThroughput<State>) {}

    static start(context: GameContext, args: ValidatorArguments): Pipeline<PipelineInput> {
      return new Pipeline({ status: ValidationStatus.Pending, state: { context, ...args } });
    }

    static pass<State extends PipelineInput, NewValue extends ComputedValue>(
      state: State,
      newValue: NewValue,
    ): PendingResult<State & NewValue> {
      Object.assign(state, newValue);
      return { status: ValidationStatus.Pending, state: state as State & NewValue };
    }

    static fail(error: ValidationErrors): InvalidResult {
      return { status: ValidationStatus.Invalid, error };
    }

    continue<NextState extends State>(callback: (state: State) => PipelineThroughput<NextState>): Pipeline<NextState> {
      if (this.throughput.status === ValidationStatus.Pending) this.throughput = callback(this.throughput.state);
      return this as unknown as Pipeline<NextState>;
    }

    end(): PipelineOutput {
      if (this.throughput.status === ValidationStatus.Invalid) return this.throughput;
      const { sequences, placements, words, score } = this.throughput.state as unknown as PipelineState<ScoreOutput>;
      if (score === undefined) throw new Error('Can`t show end result when pipeline wasn`t completed');
      return { status: ValidationStatus.Valid, sequences, placements, words, score } as ValidResult;
    }
  };

  private static computeAndValidateSequences(state: PipelineInput): PipelineThroughput<PipelineState<SequencesOutput>> {
    const tiles = state.initialPlacement.tileSequence;
    if (tiles.length === 0) return this.Pipeline.fail(ValidationErrors.InvalidTilePlacement);
    const cells = state.initialPlacement.cellSequence;
    if (cells.length === 0) return this.Pipeline.fail(ValidationErrors.InvalidCellPlacement);
    const { board, turnkeeper } = state.context;
    const anchorCells = board.getAnchorCells(turnkeeper.historyIsEmpty);
    const someCellsAreAnchor = cells.some(cell => anchorCells.has(cell));
    return someCellsAreAnchor
      ? this.Pipeline.pass(state, { sequences: { cell: cells, tile: tiles } })
      : this.Pipeline.fail(ValidationErrors.NoCellsUsableAsFirst);
  }

  private static computeAndValidatePlacements(
    state: PipelineState<SequencesOutput>,
  ): PipelineThroughput<PipelineState<PlacementsOutput>> {
    const { board } = state.context;
    const tileSequence = state.sequences.tile;
    const primaryAxis = AxisCalculator.execute(board, { cellSequence: state.sequences.cell });
    const coords = { axis: primaryAxis, cell: state.sequences.cell[0] };
    const primaryPlacement = PlacementBuilder.execute(board, { coords, tileSequence });
    const isPlacementUsable = (placement: Placement): boolean => placement.length > 1;
    if (!isPlacementUsable(primaryPlacement)) return this.Pipeline.fail(ValidationErrors.InvalidTilePlacement);
    const placements: Array<Placement> = [primaryPlacement];
    for (const cell of state.sequences.cell) {
      const coords: AnchorCoordinates = { axis: board.getOppositeAxis(primaryAxis), cell };
      const placement = PlacementBuilder.execute(board, { coords, tileSequence });
      if (isPlacementUsable(placement)) placements.push(placement);
    }
    return this.Pipeline.pass(state, { placements });
  }

  private static computeAndValidateWords(
    state: PipelineState<PlacementsOutput>,
  ): PipelineThroughput<PipelineState<WordsOutput>> {
    const { dictionary, inventory } = state.context;
    const words: Array<string> = [];
    for (let i = 0; i < state.placements.length; i++) {
      const placement = state.placements[i];
      let word = '';
      for (const { tile } of placement) word += inventory.getTileLetter(tile);
      words[i] = word;
    }
    return dictionary.containsWords(words)
      ? this.Pipeline.pass(state, { words })
      : this.Pipeline.fail(ValidationErrors.WordNotInDictionary);
  }

  private static computeAndValidateScore(
    state: PipelineState<WordsOutput>,
  ): PipelineThroughput<PipelineState<ScoreOutput>> {
    const { board, inventory } = state.context;
    const newCells = new Set(state.sequences.cell);
    const score = ScoreComputer.execute(
      state.placements,
      newCells,
      tile => inventory.getTilePoints(tile),
      cell => board.getLetterMultiplier(cell),
      cell => board.getWordMultiplier(cell),
    );
    return this.Pipeline.pass(state, { score });
  }
}
