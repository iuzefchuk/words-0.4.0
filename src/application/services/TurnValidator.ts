import { GameContext } from '@/application/Game.ts';
import { CellIndex, AnchorCoordinates } from '@/domain/models/Board.ts';
import { TileId } from '@/domain/models/Inventory.ts';
import PlacementLinksBuilder from '@/domain/services/PlacementBuilder.ts';
import ScoreCalculator from '@/domain/services/ScoreCalculator.ts';
import {
  PlacementLinks,
  ValidationStatus,
  ValidationError,
  ComputedValue,
  ValidationResult,
  InvalidResult,
  ValidResult,
} from '@/domain/models/TurnHistory.ts';

export type ValidatorArguments = { initialPlacementLinks: PlacementLinks };

type ComputedSequences = { sequences: { cell: ReadonlyArray<CellIndex>; tile: ReadonlyArray<TileId> } };
type ComputedPlacementLinks = { placementLinks: ReadonlyArray<PlacementLinks> };
type ComputedWords = { words: ReadonlyArray<string> };
type ComputedScore = { score: number };

export type PendingResult<State> = { status: ValidationStatus.Pending; state: State };

export type PipelineInput = { context: GameContext } & ValidatorArguments;
export type PipelineThroughput<State> =
  | PendingResult<State>
  | { status: ValidationStatus.Invalid; error: ValidationError };
export type PipelineState<Output extends ComputedValue> = PipelineInput & Output;
export type PipelineOutput =
  | { status: ValidationStatus.Invalid; error: ValidationError }
  | ({ status: ValidationStatus.Valid } & ComputedSequences & ComputedPlacementLinks & ComputedWords & ComputedScore);

export type SequencesOutput = ComputedSequences;
export type PlacementLinksOutput = SequencesOutput & ComputedPlacementLinks;
export type WordsOutput = PlacementLinksOutput & ComputedWords;
export type ScoreOutput = WordsOutput & ComputedScore;

export default class TurnValidator {
  static execute(context: GameContext, initialPlacementLinks: PlacementLinks): ValidationResult {
    const args: ValidatorArguments = { initialPlacementLinks };
    return this.Pipeline.start(context, args)
      .continue(state => this.computeAndValidateSequences(state))
      .continue(state => this.computeAndValidateAllPlacementLinks(state))
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

    static fail(error: ValidationError): InvalidResult {
      return { status: ValidationStatus.Invalid, error };
    }

    continue<NextState extends State>(callback: (state: State) => PipelineThroughput<NextState>): Pipeline<NextState> {
      if (this.throughput.status === ValidationStatus.Pending) this.throughput = callback(this.throughput.state);
      return this as unknown as Pipeline<NextState>;
    }

    end(): PipelineOutput {
      if (this.throughput.status === ValidationStatus.Invalid) return this.throughput;
      const { sequences, placementLinks, words, score } = this.throughput
        .state as unknown as PipelineState<ScoreOutput>;
      if (score === undefined) throw new Error('Can`t show end result when pipeline wasn`t completed');
      return { status: ValidationStatus.Valid, sequences, placementLinks, words, score } as ValidResult;
    }
  };

  private static computeAndValidateSequences(state: PipelineInput): PipelineThroughput<PipelineState<SequencesOutput>> {
    const tiles = state.initialPlacementLinks.map(link => link.tile);
    if (tiles.length === 0) return this.Pipeline.fail(ValidationError.InvalidTilePlacement);
    const cells = state.initialPlacementLinks.map(link => link.cell);
    if (cells.length === 0) return this.Pipeline.fail(ValidationError.InvalidCellPlacement);
    const { board, turnDirector } = state.context;
    const anchorCells = board.getAnchorCells(turnDirector.historyHasOpponentTurns);
    const someCellsAreAnchor = cells.some(cell => anchorCells.has(cell));
    return someCellsAreAnchor
      ? this.Pipeline.pass(state, { sequences: { cell: cells, tile: tiles } })
      : this.Pipeline.fail(ValidationError.NoCellsUsableAsFirst);
  }

  private static computeAndValidateAllPlacementLinks(
    state: PipelineState<SequencesOutput>,
  ): PipelineThroughput<PipelineState<PlacementLinksOutput>> {
    const { board } = state.context;
    const tileSequence = state.sequences.tile;
    const primaryAxis = board.calculateAxis(state.sequences.cell);
    const coords = { axis: primaryAxis, cell: state.sequences.cell[0] };
    const primaryPlacementLinks = PlacementLinksBuilder.execute(board, { coords, tileSequence });
    const areLinksUsable = (placementLinks: PlacementLinks): boolean => placementLinks.length > 1;
    if (!areLinksUsable(primaryPlacementLinks)) return this.Pipeline.fail(ValidationError.InvalidTilePlacement);
    const result: Array<PlacementLinks> = [primaryPlacementLinks];
    for (const cell of state.sequences.cell) {
      const coords: AnchorCoordinates = { axis: board.getOppositeAxis(primaryAxis), cell };
      const secondaryPlacementLinks = PlacementLinksBuilder.execute(board, { coords, tileSequence });
      if (areLinksUsable(secondaryPlacementLinks)) result.push(secondaryPlacementLinks);
    }
    return this.Pipeline.pass(state, { placementLinks: result });
  }

  private static computeAndValidateWords(
    state: PipelineState<PlacementLinksOutput>,
  ): PipelineThroughput<PipelineState<WordsOutput>> {
    const { dictionary, inventory } = state.context;
    const words: Array<string> = [];
    for (let i = 0; i < state.placementLinks.length; i++) {
      const placementLinks = state.placementLinks[i];
      let word = '';
      for (const { tile } of placementLinks) word += inventory.getTileLetter(tile);
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
    const newCells = new Set(state.sequences.cell);
    const score = ScoreCalculator.execute(
      state.placementLinks,
      newCells,
      tile => inventory.getTilePoints(tile),
      cell => board.getLetterMultiplier(cell),
      cell => board.getWordMultiplier(cell),
    );
    return this.Pipeline.pass(state, { score });
  }
}
