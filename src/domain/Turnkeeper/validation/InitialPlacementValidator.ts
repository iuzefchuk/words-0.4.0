import { GameContext } from '@/domain/types.ts';
import AxisCalculator from '@/domain/Layout/calculation/AxisCalculator.ts';
import PlacementBuilder from '@/domain/Turnkeeper/construction/PlacementBuilder.ts';
import AnchorCellFinder from '@/domain/Turnkeeper/search/AnchorCellFinder.ts';
import { ValidationErrors, ValidationStatus } from '@/domain/Turnkeeper/enums.ts';
import {
  Arguments,
  ComputedValue,
  PendingResult,
  InvalidResult,
  ValidResult,
  PipelineInput,
  PipelineState,
  PipelineThroughput,
  PipelineOutput,
  SequencesOutput,
  PlacementsOutput,
  WordsOutput,
  ScoreOutput,
} from '@/domain/Turnkeeper/types/local/initialPlacementValidation.ts';
import { Placement } from '@/domain/Turnkeeper/types/shared.ts';
import { AnchorCoordinates } from '@/domain/Layout/types/shared.ts';

export default class InitialPlacementValidator {
  static execute(context: GameContext, args: Arguments): PipelineOutput {
    return this.Pipeline.start(context, args)
      .continue(state => this.computeAndValidateSequences(state))
      .continue(state => this.computeAndValidatePlacements(state))
      .continue(state => this.computeAndValidateWords(state))
      .continue(state => this.computeAndValidateScore(state))
      .end();
  }

  private static Pipeline = class Pipeline<State extends PipelineInput> {
    private constructor(private throughput: PipelineThroughput<State>) {}

    static start(context: GameContext, args: Arguments): Pipeline<PipelineInput> {
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
    const tiles = state.initialPlacement.map(placement => placement.tile);
    if (tiles.length === 0) return this.Pipeline.fail(ValidationErrors.InvalidTilePlacement);
    const cells = state.initialPlacement.map(placement => placement.cell);
    if (cells.length === 0) return this.Pipeline.fail(ValidationErrors.InvalidCellPlacement);
    const anchorCells = AnchorCellFinder.execute(state.context);
    const someCellsAreAnchor = cells.some(cell => anchorCells.has(cell));
    return someCellsAreAnchor
      ? this.Pipeline.pass(state, { sequences: { cell: cells, tile: tiles } })
      : this.Pipeline.fail(ValidationErrors.NoCellsUsableAsFirst);
  }

  private static computeAndValidatePlacements(
    state: PipelineState<SequencesOutput>,
  ): PipelineThroughput<PipelineState<PlacementsOutput>> {
    const { layout } = state.context;
    const tileSequence = state.sequences.tile;
    const primaryAxis = AxisCalculator.execute(state.context, { cellSequence: state.sequences.cell });
    const coords = { axis: primaryAxis, cell: state.sequences.cell[0] };
    const primaryPlacement = PlacementBuilder.execute(state.context, { coords, tileSequence });
    const isPlacementUsable = (placement: Placement): boolean => placement.length > 1;
    if (!isPlacementUsable(primaryPlacement)) return this.Pipeline.fail(ValidationErrors.InvalidTilePlacement);
    const placements: Array<Placement> = [primaryPlacement];
    for (const cell of state.sequences.cell) {
      const coords: AnchorCoordinates = { axis: layout.getOppositeAxis(primaryAxis), cell };
      const placement = PlacementBuilder.execute(state.context, { coords, tileSequence });
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
      for (let j = 0; j < placement.length; j++) word += inventory.getTileLetter(placement[j].tile);
      words[i] = word;
    }
    return dictionary.containsWords(words)
      ? this.Pipeline.pass(state, { words })
      : this.Pipeline.fail(ValidationErrors.WordNotInDictionary);
  }

  private static computeAndValidateScore(
    state: PipelineState<WordsOutput>,
  ): PipelineThroughput<PipelineState<ScoreOutput>> {
    const { layout, inventory } = state.context;
    const newCells = new Set(state.sequences.cell);
    let totalScore = 0;
    for (const placement of state.placements) {
      let placementScore = 0;
      let placementMultiplier = 1;
      for (const { cell, tile } of placement) {
        const tileIsNew = newCells.has(cell);
        placementScore += inventory.getTilePoints(tile) * (tileIsNew ? layout.getLetterMultiplier(cell) : 1);
        placementMultiplier *= tileIsNew ? layout.getWordMultiplier(cell) : 1;
      }
      totalScore += placementScore * placementMultiplier;
    }
    return this.Pipeline.pass(state, { score: totalScore });
  }
}
