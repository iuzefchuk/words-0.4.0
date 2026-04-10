import Board from '@/domain/models/board/Board.ts';
import { AnchorCoordinates, Placement } from '@/domain/models/board/types.ts';
import Dictionary from '@/domain/models/dictionary/Dictionary.ts';
import Inventory from '@/domain/models/inventory/Inventory.ts';
import { ValidationError, ValidationStatus } from '@/domain/models/turns/enums.ts';
import Turns from '@/domain/models/turns/Turns.ts';
import {
  ComputedCells,
  ComputedPlacements,
  ComputedScore,
  ComputedValue,
  ComputedWords,
  InvalidResult,
  ValidationResult,
  ValidResult,
} from '@/domain/models/turns/types.ts';
import ScoringService from '@/domain/services/scoring/ScoringService.ts';

export type ValidatorContext = { board: Board; dictionary: Dictionary; inventory: Inventory; turns: Turns };

type ComputedTilesOutput = ComputedPlacements & SequencesOutput;

type PendingResult<State> = { state: State; status: ValidationStatus.Pending };

type PipelineInput = { context: ValidatorContext };

type PipelineOutput = InvalidResult | ValidResult;

type PipelineState<Output extends ComputedValue> = Output & PipelineInput;

type PipelineThroughput<State> = InvalidResult | PendingResult<State>;

type ScoreOutput = ComputedScore & WordsOutput;

type SequencesOutput = ComputedCells;

type WordsOutput = ComputedTilesOutput & ComputedWords;

export default class TurnValidationService {
  private static Pipeline = class Pipeline<State extends PipelineInput> {
    private constructor(private throughput: PipelineThroughput<State>) {}

    static fail(error: ValidationError): InvalidResult {
      return { error, status: ValidationStatus.Invalid };
    }

    static pass<State extends PipelineInput, NewValue extends ComputedValue>(state: State, newValue: NewValue): PendingResult<NewValue & State> {
      Object.assign(state, newValue);
      return { state: state as NewValue & State, status: ValidationStatus.Pending };
    }

    static start(context: ValidatorContext): Pipeline<PipelineInput> {
      return new Pipeline({ state: { context }, status: ValidationStatus.Pending });
    }

    continue<NextState extends State>(callback: (state: State) => PipelineThroughput<NextState>): Pipeline<NextState> {
      if (this.throughput.status === ValidationStatus.Pending) this.throughput = callback(this.throughput.state);
      return this as unknown as Pipeline<NextState>;
    }

    end(): PipelineOutput {
      if (this.throughput.status === ValidationStatus.Invalid) return this.throughput;
      const { cells, placements, score, words } = this.throughput.state as unknown as PipelineState<ScoreOutput>;
      if (score === undefined) throw new Error('Can`t end pipeline until it`s completed');
      return { cells, placements, score, status: ValidationStatus.Valid, words } as ValidResult;
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
    // TODO to separate service (same as ScoringService)
    const { board, turns } = state.context;
    const tiles = turns.currentTurnTiles;
    if (tiles.length === 0) return this.Pipeline.fail(ValidationError.InvalidTilePlacement);
    const placement = board.resolvePlacement(tiles);
    const cells = placement.map(link => link.cell);
    const placementCells = new Set(cells);
    const someCellsAreAnchor = cells.some(cell => {
      if (board.isCellCenter(cell)) return true;
      if (!turns.historyHasPriorTurns) return false;
      return board.calculateAdjacentCells(cell).some(adj => board.isCellOccupied(adj) && !placementCells.has(adj));
    });
    return someCellsAreAnchor ? this.Pipeline.pass(state, { cells }) : this.Pipeline.fail(ValidationError.NoCellsUsableAsFirst);
  }

  private static computeAndValidatePlacements(state: PipelineState<SequencesOutput>): PipelineThroughput<PipelineState<ComputedTilesOutput>> {
    // TODO to separate service (same as ScoringService)
    const { board, turns } = state.context;
    const tiles = turns.currentTurnTiles;
    const primaryAxis = board.calculateAxis(state.cells);
    const cell = state.cells[0];
    if (cell === undefined) throw new ReferenceError('Cell must be defined');
    const coords = { axis: primaryAxis, cell };
    const primaryPlacement = board.createPlacement(coords, tiles);
    const areLinksUsable = (placement: Placement): boolean => placement.length > 1;
    if (!areLinksUsable(primaryPlacement)) return this.Pipeline.fail(ValidationError.InvalidTilePlacement);
    const result: Array<Placement> = [primaryPlacement];
    for (const cell of state.cells) {
      const coords: AnchorCoordinates = { axis: board.getOppositeAxis(primaryAxis), cell };
      const tile = board.findTileByCell(cell);
      if (!tile) continue;
      const secondaryPlacement = board.createPlacement(coords, [tile]);
      if (areLinksUsable(secondaryPlacement)) result.push(secondaryPlacement);
    }
    return this.Pipeline.pass(state, { placements: result });
  }

  private static computeAndValidateScore(state: PipelineState<WordsOutput>): PipelineThroughput<PipelineState<ScoreOutput>> {
    const { board, inventory } = state.context;
    const newCells = new Set(state.cells);
    const score = ScoringService.execute(
      state.placements,
      newCells,
      tile => inventory.getTilePoints(tile),
      cell => board.getMultiplierForLetter(cell),
      cell => board.getMultiplierForWord(cell),
    );
    return this.Pipeline.pass(state, { score });
  }

  private static computeAndValidateWords(state: PipelineState<ComputedTilesOutput>): PipelineThroughput<PipelineState<WordsOutput>> {
    // TODO to separate service (same as ScoringService)
    const { dictionary, inventory } = state.context;
    const words: Array<string> = [];
    for (let i = 0; i < state.placements.length; i++) {
      const placement = state.placements[i];
      if (placement === undefined) throw new ReferenceError('Placement must be defined');
      const letters: Array<string> = [];
      for (const { tile } of placement) letters.push(inventory.getTileLetter(tile));
      words[i] = letters.join('');
    }
    return dictionary.containsAllWords(words) ? this.Pipeline.pass(state, { words }) : this.Pipeline.fail(ValidationError.WordNotInDictionary);
  }
}
