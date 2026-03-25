import Board, { AnchorCoordinates, Placement } from '@/domain/models/Board.ts';
import Dictionary from '@/domain/models/Dictionary.ts';
import Inventory from '@/domain/models/Inventory.ts';
import TurnTracker, {
  ValidationStatus,
  ValidationError,
  ComputedValue,
  ComputedCells,
  ComputedPlacements,
  ComputedWords,
  ComputedScore,
  ValidationResult,
  InvalidResult,
  ValidResult,
} from '@/domain/models/TurnTracker.ts';
import PlacementBuilder from '@/domain/services/PlacementBuilder.ts';
import ScoreCalculator from '@/domain/services/ScoreCalculator.ts';

export type ValidatorContext = { board: Board; dictionary: Dictionary; inventory: Inventory; turnTracker: TurnTracker };

export type PendingResult<State> = { status: ValidationStatus.Pending; state: State };

export type PipelineInput = { context: ValidatorContext };

export type PipelineThroughput<State> = PendingResult<State> | InvalidResult;

export type PipelineState<Output extends ComputedValue> = PipelineInput & Output;

export type PipelineOutput = InvalidResult | ValidResult;

export type SequencesOutput = ComputedCells;

export type ComputedTilesOutput = SequencesOutput & ComputedPlacements;

export type WordsOutput = ComputedTilesOutput & ComputedWords;

export type ScoreOutput = WordsOutput & ComputedScore;

export default class CurrentTurnValidator {
  private static Pipeline = class Pipeline<State extends PipelineInput> {
    private constructor(private throughput: PipelineThroughput<State>) {}

    static start(context: ValidatorContext): Pipeline<PipelineInput> {
      return new Pipeline({ status: ValidationStatus.Pending, state: { context } });
    }

    static pass<State extends PipelineInput, NewValue extends ComputedValue>(
      state: State,
      newValue: NewValue,
    ): PendingResult<State & NewValue> {
      Object.assign(state, newValue);
      return { status: ValidationStatus.Pending, state: state as State & NewValue };
    }

    static fail(error: ValidationError): InvalidResult {
      return { status: ValidationStatus.Invalid, error };
    }

    continue<NextState extends State>(callback: (state: State) => PipelineThroughput<NextState>): Pipeline<NextState> {
      if (this.throughput.status === ValidationStatus.Pending) this.throughput = callback(this.throughput.state);
      return this as unknown as Pipeline<NextState>;
    }

    end(): PipelineOutput {
      if (this.throughput.status === ValidationStatus.Invalid) return this.throughput;
      const { cells, placements, words, score } = this.throughput.state as unknown as PipelineState<ScoreOutput>;
      if (score === undefined) throw new Error('Can`t show end result when pipeline wasn`t completed');
      return { status: ValidationStatus.Valid, cells, placements, words, score } as ValidResult;
    }
  };

  static execute(context: ValidatorContext): ValidationResult {
    return this.Pipeline.start(context)
      .continue(state => this.computeAndValidateCells(state))
      .continue(state => this.computeAndValidatePlacements(state))
      .continue(state => this.computeAndValidateWords(state))
      .continue(state => this.computeAndValidateScore(state))
      .end();
  }

  private static computeAndValidateCells(state: PipelineInput): PipelineThroughput<PipelineState<SequencesOutput>> {
    const { board, turnTracker } = state.context;
    const tiles = turnTracker.currentTurnTiles;
    if (tiles.length === 0) return this.Pipeline.fail(ValidationError.InvalidTilePlacement);
    const placement = board.resolvePlacement(tiles);
    const cells = placement.map(link => link.cell);
    const placementCells = new Set(cells);
    const someCellsAreAnchor = cells.some(cell => {
      if (board.isCellCenter(cell)) return true;
      if (!turnTracker.hasPriorTurns) return false;
      return board.getAdjacentCells(cell).some(adj => board.isCellOccupied(adj) && !placementCells.has(adj));
    });
    return someCellsAreAnchor
      ? this.Pipeline.pass(state, { cells })
      : this.Pipeline.fail(ValidationError.NoCellsUsableAsFirst);
  }

  private static computeAndValidatePlacements(
    state: PipelineState<SequencesOutput>,
  ): PipelineThroughput<PipelineState<ComputedTilesOutput>> {
    const { board, turnTracker } = state.context;
    const tiles = turnTracker.currentTurnTiles;
    const primaryAxis = board.calculateAxis(state.cells);
    const coords = { axis: primaryAxis, cell: state.cells[0] };
    const primaryPlacement = PlacementBuilder.execute(board, { coords, tiles });
    const areLinksUsable = (placement: Placement): boolean => placement.length > 1;
    if (!areLinksUsable(primaryPlacement)) return this.Pipeline.fail(ValidationError.InvalidTilePlacement);
    const result: Array<Placement> = [primaryPlacement];
    for (const cell of state.cells) {
      const coords: AnchorCoordinates = { axis: board.getOppositeAxis(primaryAxis), cell };
      const tile = board.findTileByCell(cell);
      if (!tile) continue;
      const secondaryPlacement = PlacementBuilder.execute(board, { coords, tiles: [tile] });
      if (areLinksUsable(secondaryPlacement)) result.push(secondaryPlacement);
    }
    return this.Pipeline.pass(state, { placements: result });
  }

  private static computeAndValidateWords(
    state: PipelineState<ComputedTilesOutput>,
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
      : this.Pipeline.fail(ValidationError.WordNotInDictionary);
  }

  private static computeAndValidateScore(
    state: PipelineState<WordsOutput>,
  ): PipelineThroughput<PipelineState<ScoreOutput>> {
    const { board, inventory } = state.context;
    const newCells = new Set(state.cells);
    const score = ScoreCalculator.execute(
      state.placements,
      newCells,
      tile => inventory.getTilePoints(tile),
      cell => board.getLetterMultiplier(cell),
      cell => board.getWordMultiplier(cell),
    );
    return this.Pipeline.pass(state, { score });
  }
}
