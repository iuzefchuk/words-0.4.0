import { CellIndex } from '../Layout/Layout.js';
import { TileId } from '../Inventory/Inventory.js';
import { TurnState, TurnStateType, Placement, TurnInput } from './Turn.js';
import { LayoutCellUsabilityCalculator } from '../Layout/LayoutCellUsabilityCalculator.js';
import { LayoutAxisCalculator } from '../Layout/LayoutAxisCalculator.js';
import { TurnPlacementFactory } from './TurnPlacementFactory.js';

type BaseContext = TurnInput & { dependencies: Dependencies };
type SequencesContext = BaseContext & { sequences: { cell: ReadonlyArray<CellIndex>; tile: ReadonlyArray<TileId> } };
type PlacementsContext = SequencesContext & { placements: ReadonlyArray<Placement> };
type WordsContext = PlacementsContext & { words: ReadonlyArray<string> };
type ScoreContext = WordsContext & { score: number };

type PipelineResult<Context> = ValidPipelineResult<Context> | InvalidPipelineResult;
type ValidPipelineResult<Context> = { isValid: true; ctx: Context };
type InvalidPipelineResult = { isValid: false; error: ValidationErrors };

export enum ValidationErrors {
  InvalidTilePlacement = 'error_tile_1',
  InvalidCellPlacement = 'error_cell_2',
  NoCellsUsableAsFirst = 'error_cell_3',
  WordNotInDictionary = 'error_tile_4',
}

export class TurnStateComputer {
  static compute(input: TurnInput, dependencies: Dependencies): TurnState {
    const initialContext = { ...input, dependencies };
    const { result } = this.Pipeline.initialize(initialContext)
      .addStep(this.computeSequences)
      .addStep(this.computePlacements)
      .addStep(this.computeWords)
      .addStep(this.computeScore);
    return result.isValid
      ? {
          type: TurnStateType.Valid,
          sequences: result.ctx.sequences,
          score: result.ctx.score,
          words: result.ctx.words,
        }
      : {
          type: TurnStateType.Invalid,
          error: result.error,
        };
  }

  static Pipeline = class Pipeline<Context> {
    private constructor(public result: PipelineResult<Context>) {}

    static initialize<Context extends BaseContext>(ctx: Context): Pipeline<Context> {
      return new Pipeline({ isValid: true, ctx });
    }

    static createValidPipelineResult<Ctx>(ctx: Ctx): ValidPipelineResult<Ctx> {
      return { isValid: true, ctx };
    }

    static createInvalidPipelineResult(error: ValidationErrors): InvalidPipelineResult {
      return { isValid: false, error };
    }

    addStep<NextContext extends Context>(
      computer: (ctx: Context) => PipelineResult<NextContext>,
    ): Pipeline<NextContext> {
      if (this.result.isValid) this.result = computer(this.result.ctx) as PipelineResult<NextContext>;
      return this as unknown as Pipeline<NextContext>;
    }
  };

  static passComputer<OldContext extends object, NextContext extends object>(
    oldCtx: OldContext,
    nextCtx: NextContext,
  ): ValidPipelineResult<OldContext & NextContext> {
    Object.assign(oldCtx, nextCtx);
    return this.Pipeline.createValidPipelineResult(oldCtx as OldContext & NextContext);
  }

  static failComputer(error: ValidationErrors): InvalidPipelineResult {
    return this.Pipeline.createInvalidPipelineResult(error);
  }

  static computeSequences(ctx: BaseContext): PipelineResult<SequencesContext> {
    const { layout, turnManager } = ctx.dependencies;
    const tiles = ctx.initPlacement.map(placement => placement.tile);
    if (tiles.length === 0) return this.failComputer(ValidationErrors.InvalidTilePlacement);
    const cells = ctx.initPlacement.map(placement => placement.cell);
    if (cells.length === 0) return this.failComputer(ValidationErrors.InvalidCellPlacement);
    const cellUsabilityCalculator = new LayoutCellUsabilityCalculator(layout, turnManager);
    const noCellsUsableAsFirst = cells.every(cell => !cellUsabilityCalculator.isUsableAsFirst(cell));
    if (noCellsUsableAsFirst) return this.failComputer(ValidationErrors.NoCellsUsableAsFirst);
    return this.passComputer(ctx, { sequences: { cell: cells, tile: tiles } });
  }

  static computePlacements(ctx: SequencesContext): PipelineResult<PlacementsContext> {
    const { layout, turnManager } = ctx.dependencies;
    const tileSequence = ctx.sequences.tile;
    const axisCalculator = new LayoutAxisCalculator(layout, turnManager);
    const primaryAxis = axisCalculator.calculatePrimary(ctx.sequences.cell);
    const factory = new TurnPlacementFactory(layout, turnManager);
    const primaryPlacement = factory.create({ axis: primaryAxis, targetCell: ctx.sequences.cell[0], tileSequence });
    const isPlacementUsable = (placement: Placement): boolean => placement.length > 1;
    if (!isPlacementUsable(primaryPlacement)) return this.failComputer(ValidationErrors.InvalidTilePlacement);
    const placements: Array<Placement> = [primaryPlacement];
    for (const cell of ctx.sequences.cell) {
      const placement = factory.create({ axis: layout.getOppositeAxis(primaryAxis), targetCell: cell, tileSequence });
      if (isPlacementUsable(placement)) placements.push(placement);
    }
    return placements.length > 0
      ? this.passComputer(ctx, { placements })
      : this.failComputer(ValidationErrors.InvalidTilePlacement);
  }

  static computeWords(ctx: PlacementsContext): PipelineResult<WordsContext> {
    const { dictionary, inventory } = ctx.dependencies;
    const words: Array<string> = [];
    for (let i = 0; i < ctx.placements.length; i++) {
      const placement = ctx.placements[i];
      let word = '';
      for (let j = 0; j < placement.length; j++) word += inventory.getTileLetter(placement[j].tile);
      words[i] = word;
    }
    return dictionary.hasWords(words)
      ? this.passComputer(ctx, { words })
      : this.failComputer(ValidationErrors.WordNotInDictionary);
  }

  static computeScore(ctx: WordsContext): PipelineResult<ScoreContext> {
    const { layout, inventory } = ctx.dependencies;
    let totalScore = 0;
    for (const placement of ctx.placements) {
      let placementScore = 0;
      let placementMultiplier = 1;
      for (const { cell, tile } of placement) {
        placementScore += inventory.getTilePoints(tile) * layout.getLetterMultiplier(cell);
        placementMultiplier *= layout.getWordMultiplier(cell);
      }
      totalScore += placementScore * placementMultiplier;
    }
    return this.passComputer(ctx, { score: totalScore });
  }
}
