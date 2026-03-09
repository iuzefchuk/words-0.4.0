import AxisCalculator from '@/domain/Layout/calculation/AxisCalculator.ts';
import PlacementBuilder from '@/domain/Turnkeeper/construction/PlacementBuilder.ts';
import AnchorCellFinder from '@/domain/Turnkeeper/search/AnchorCellFinder.ts';
import { ValidationErrors, ValidationStatus } from '@/domain/Turnkeeper/enums.ts';
import {
  FinalResult,
  StepResult,
  PendingResult,
  InvalidResult,
  PipelineContext,
  InitialContext,
  SequencesContext,
  PlacementsContext,
  WordsContext,
  ScoreContext,
} from '@/domain/Turnkeeper/types/local/validation.ts';
import { Placement } from '@/domain/Turnkeeper/types/shared.ts';

export default class InitialPlacementValidator {
  static execute(ctx: InitialContext): FinalResult {
    return this.Pipeline.initialize(ctx)
      .addStep(this.computeSequences)
      .addStep(this.computePlacements)
      .addStep(this.computeWords)
      .addStep(this.computeScore)
      .getFinalResult();
  }

  private static Pipeline = class Pipeline<Context extends PipelineContext> {
    private constructor(private result: StepResult<Context>) {}

    static initialize(ctx: InitialContext): Pipeline<InitialContext> {
      return new Pipeline({ status: ValidationStatus.Pending, ctx });
    }

    static continue<CurrentContext extends PipelineContext, NextContext extends object>(
      ctx: CurrentContext,
      newCtxValues: NextContext,
    ): PendingResult<CurrentContext & NextContext> {
      Object.assign(ctx, newCtxValues);
      return { status: ValidationStatus.Pending, ctx: ctx as CurrentContext & NextContext };
    }

    static fail(error: ValidationErrors): InvalidResult {
      return { status: ValidationStatus.Invalid, error };
    }

    addStep<NextContext extends Context>(computer: (ctx: Context) => StepResult<NextContext>): Pipeline<NextContext> {
      if (this.result.status === ValidationStatus.Pending) {
        this.result = computer(this.result.ctx) as StepResult<NextContext>;
      }
      return this as unknown as Pipeline<NextContext>;
    }

    getFinalResult(): FinalResult {
      if (this.result.status === ValidationStatus.Invalid) return this.result;
      const { sequences, placements, words, score } = this.result.ctx as ScoreContext;
      if (score === undefined) throw new Error('Can`t show end result when pipeline wasn`t completed');
      return { status: ValidationStatus.Valid, sequences, placements, words, score };
    }
  };

  private static computeSequences(ctx: InitialContext): StepResult<SequencesContext> {
    const { layout, turnkeeper } = ctx.gameContext;
    const tiles = ctx.initialPlacement.map(placement => placement.tile);
    if (tiles.length === 0) return this.Pipeline.fail(ValidationErrors.InvalidTilePlacement);
    const cells = ctx.initialPlacement.map(placement => placement.cell);
    if (cells.length === 0) return this.Pipeline.fail(ValidationErrors.InvalidCellPlacement);
    const anchorCells = new AnchorCellFinder(layout, turnkeeper).execute();
    const someCellsAreAnchor = cells.some(cell => anchorCells.has(cell));
    return someCellsAreAnchor
      ? this.Pipeline.continue(ctx, { sequences: { cell: cells, tile: tiles } })
      : this.Pipeline.fail(ValidationErrors.NoCellsUsableAsFirst);
  }

  private static computePlacements(ctx: SequencesContext): StepResult<PlacementsContext> {
    const { layout, turnkeeper } = ctx.gameContext;
    const tileSequence = ctx.sequences.tile;
    const axisCalculator = new AxisCalculator(layout, turnkeeper);
    const primaryAxis = axisCalculator.execute(ctx.sequences.cell);
    const placementBuilder = new PlacementBuilder(layout, turnkeeper);
    const primaryPlacement = placementBuilder.execute({
      coords: { axis: primaryAxis, index: ctx.sequences.cell[0] },
      tileSequence,
    });
    const isPlacementUsable = (placement: Placement): boolean => placement.length > 1;
    if (!isPlacementUsable(primaryPlacement)) return this.Pipeline.fail(ValidationErrors.InvalidTilePlacement);
    const placements: Array<Placement> = [primaryPlacement];
    for (const cell of ctx.sequences.cell) {
      const placement = placementBuilder.execute({
        coords: { axis: layout.getOppositeAxis(primaryAxis), index: cell },
        tileSequence,
      });
      if (isPlacementUsable(placement)) placements.push(placement);
    }
    return this.Pipeline.continue(ctx, { placements });
  }

  private static computeWords(ctx: PlacementsContext): StepResult<WordsContext> {
    const { dictionary, inventory } = ctx.gameContext;
    const words: Array<string> = [];
    for (let i = 0; i < ctx.placements.length; i++) {
      const placement = ctx.placements[i];
      let word = '';
      for (let j = 0; j < placement.length; j++) word += inventory.getTileLetter(placement[j].tile);
      words[i] = word;
    }
    return dictionary.hasWords(words)
      ? this.Pipeline.continue(ctx, { words })
      : this.Pipeline.fail(ValidationErrors.WordNotInDictionary);
  }

  private static computeScore(ctx: WordsContext): StepResult<ScoreContext> {
    const { layout, inventory } = ctx.gameContext;
    const newCells = new Set(ctx.sequences.cell);
    let totalScore = 0;
    for (const placement of ctx.placements) {
      let placementScore = 0;
      let placementMultiplier = 1;
      for (const { cell, tile } of placement) {
        const tileIsNew = newCells.has(cell);
        placementScore += inventory.getTilePoints(tile) * (tileIsNew ? layout.getLetterMultiplier(cell) : 1);
        placementMultiplier *= tileIsNew ? layout.getWordMultiplier(cell) : 1;
      }
      totalScore += placementScore * placementMultiplier;
    }
    return this.Pipeline.continue(ctx, { score: totalScore });
  }
}
