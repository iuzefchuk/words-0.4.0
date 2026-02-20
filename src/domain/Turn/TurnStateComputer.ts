import { CellIndex, Axis, Layout } from '../Layout/Layout.js';
import { Inventory, TileId } from '../Inventory.js';
import { TurnComputeds, TurnState, TurnStateType, Placement, TurnInput, TurnManager } from './Turn.js';
import { LayoutCellUsabilityCalculator } from '../Layout/LayoutCellUsabilityCalculator.js';
import { LayoutAxisCalculator } from '../Layout/LayoutAxisCalculator.js';
import { Dictionary } from '../Dictionary/Dictionary.js';

type PipelineDependencies = { layout: Layout; dictionary: Dictionary; inventory: Inventory; turnManager: TurnManager };

type PipelineComputeds = Partial<TurnComputeds> & { placements?: ReadonlyArray<Placement> };

type PipelineContext = TurnInput & { dependencies: PipelineDependencies } & PipelineComputeds;

type PipelineResult = ValidPipelineResult | InvalidPipelineResult;

type ValidPipelineResult = { valid: true; context: PipelineContext };

type InvalidPipelineResult = { valid: false; error: ValidationErrors };

enum ValidationErrors {
  NoCellsUsableAsFirst = 'error_cell_3',
  InvalidTilePlacement = 'error_tile_1',
  WordNotInDictionary = 'error_tile_4',
}

export class TurnStateComputer {
  constructor(private readonly dependencies: PipelineDependencies) {}

  compute(args: TurnInput): TurnState {
    const { result } = ValidationPipeline.initialize({ ...args, dependencies: this.dependencies } as PipelineContext)
      .step(PipelineSequencesComputer.compute)
      .step(PipelinePlacementsComputer.compute)
      .step(PipelineWordsComputer.compute)
      .step(PipelineScoreComputer.compute);
    return result.valid
      ? {
          type: TurnStateType.Valid,
          sequences: result.context.sequences!,
          score: result.context.score!,
          words: result.context.words!,
        }
      : { type: TurnStateType.Invalid, error: result.error };
  }
}

class ValidationPipeline {
  private constructor(public result: PipelineResult) {}

  static initialize(context: PipelineContext) {
    return new ValidationPipeline(this.passStep(context));
  }

  static passStep(context: PipelineContext): ValidPipelineResult {
    return { valid: true, context };
  }

  static failStep(error: ValidationErrors): InvalidPipelineResult {
    return { valid: false, error };
  }

  step(processor: (context: PipelineContext) => PipelineResult): ValidationPipeline {
    if (this.result.valid) this.result = processor(this.result.context);
    return this;
  }
}

class PipelineSequencesComputer {
  static compute(ctx: PipelineContext): PipelineResult {
    const { layout, turnManager } = ctx.dependencies;
    const cellSequence = this.calculateCellSequence(ctx.initPlacement);
    const tileSequence = this.calculateTileSequence(ctx.initPlacement);
    const cellsHaveUsableFirst = cellSequence.some(cell =>
      new LayoutCellUsabilityCalculator(layout, turnManager).isUsableAsFirst(cell),
    );
    return cellsHaveUsableFirst
      ? ValidationPipeline.passStep({ ...ctx, sequences: { cell: cellSequence, tile: tileSequence } })
      : ValidationPipeline.failStep(ValidationErrors.NoCellsUsableAsFirst);
  }

  private static calculateCellSequence(initPlacement: Placement): ReadonlyArray<CellIndex> {
    return initPlacement.map(placement => placement.cell);
  }

  private static calculateTileSequence(initPlacement: Placement): ReadonlyArray<TileId> {
    return initPlacement.map(placement => placement.tile);
  }
}

class PipelinePlacementsComputer {
  static compute(ctx: PipelineContext): PipelineResult {
    if (!ctx.sequences) throw new Error('Sequences need to be computed before placements');
    const { layout, turnManager } = ctx.dependencies;
    const primaryAxis = new LayoutAxisCalculator(layout, turnManager).calculatePrimary(ctx.sequences.cell);
    const placements = this.calculatePlacements({
      primaryAxis,
      sequences: ctx.sequences,
      dependencies: ctx.dependencies,
    });
    return placements.length > 0
      ? ValidationPipeline.passStep({ ...ctx, placements })
      : ValidationPipeline.failStep(ValidationErrors.InvalidTilePlacement);
  }

  private static calculatePlacements(args: {
    primaryAxis: Axis;
    sequences: { cell: ReadonlyArray<CellIndex>; tile: ReadonlyArray<TileId> };
    dependencies: PipelineDependencies;
  }): ReadonlyArray<Placement> {
    const { primaryAxis, sequences, dependencies } = args;
    const { cell: cellSequence, tile: tileSequence } = sequences;
    const { layout } = dependencies;
    const primary = this.buildPlacement({
      axis: primaryAxis,
      targetCell: cellSequence[0],
      tileSequence,
      dependencies,
    });
    if (!this.isPlacementUsable(primary)) return [];
    const secondaryAxis = layout.getOppositeAxis(primaryAxis);
    const secondaryPlacements = cellSequence
      .map(cell =>
        this.buildPlacement({
          axis: secondaryAxis,
          targetCell: cell,
          tileSequence,
          dependencies,
        }),
      )
      .filter(this.isPlacementUsable);
    return [primary, ...secondaryPlacements];
  }

  private static buildPlacement(args: {
    axis: Axis;
    targetCell: CellIndex;
    tileSequence: ReadonlyArray<TileId>;
    dependencies: PipelineDependencies;
  }): Placement {
    const { axis, targetCell, tileSequence, dependencies } = args;
    const { layout } = dependencies;
    const axisCells = layout.getAxisCells({ axis, targetCell });
    return this.calculatePlacementFromAxisCells({ axisCells, tileSequence, dependencies });
  }

  private static calculatePlacementFromAxisCells(args: {
    axisCells: ReadonlyArray<CellIndex>;
    tileSequence: ReadonlyArray<TileId>;
    dependencies: PipelineDependencies;
  }): Placement {
    const { axisCells, tileSequence, dependencies } = args;
    const { turnManager } = dependencies;
    if (tileSequence.length === 0) return [];
    const tileSet = new Set(tileSequence);
    const placement: Placement = [];
    let segmentHasTurnTile = false;
    let matchedTurnTiles = 0;
    for (const cell of axisCells) {
      const tile = turnManager.findTileByCell(cell);
      if (!tile) {
        if (placement.length === 0) continue;
        if (segmentHasTurnTile) break;
        placement.length = 0;
        segmentHasTurnTile = false;
        matchedTurnTiles = 0;
        continue;
      }
      placement.push({ cell, tile });
      if (tileSet.has(tile)) {
        segmentHasTurnTile = true;
        matchedTurnTiles++;
      }
    }
    const allTurnTilesUsed = matchedTurnTiles === tileSequence.length;
    return segmentHasTurnTile && allTurnTilesUsed ? placement : [];
  }

  private static isPlacementUsable(placement: Placement): boolean {
    return placement.length > 1;
  }
}

class PipelineWordsComputer {
  static compute(ctx: PipelineContext): PipelineResult {
    if (!ctx.placements) throw new Error('Placements need to be computed before words');
    const { dictionary, inventory } = ctx.dependencies;
    const words = this.calculateWords({ placements: ctx.placements, inventory });
    return dictionary.hasWords(words)
      ? ValidationPipeline.passStep({ ...ctx, words })
      : ValidationPipeline.failStep(ValidationErrors.WordNotInDictionary);
  }

  private static calculateWords(args: {
    placements: ReadonlyArray<Placement>;
    inventory: Inventory;
  }): ReadonlyArray<string> {
    const { placements, inventory } = args;
    return placements.map(placement => placement.map(link => inventory.getTileLetter(link.tile)).join(''));
  }
}

class PipelineScoreComputer {
  static compute(ctx: PipelineContext): PipelineResult {
    if (!ctx.placements) throw new Error('Placements need to be computed before score');
    const score = ctx.placements.reduce((result: number, placement) => {
      result += this.calculatePlacementScore({ placement, dependencies: ctx.dependencies });
      return result;
    }, 0);
    return ValidationPipeline.passStep({ ...ctx, score });
  }

  private static calculatePlacementScore(args: { placement: Placement; dependencies: PipelineDependencies }): number {
    const { placement, dependencies } = args;
    const { layout, inventory } = dependencies;
    const pluralMultipliers: Array<number> = [];
    return placement.reduce((result, { cell, tile }, idx) => {
      const tileIsLast = idx === placement.length - 1;
      let points = inventory.getTilePoints(tile);
      const singularMultiplier = layout.getLetterMultiplier(cell);
      points *= singularMultiplier;
      const pluralMultiplier = layout.getWordMultiplier(cell);
      pluralMultipliers.push(pluralMultiplier);
      result += points;
      if (tileIsLast) result *= pluralMultipliers.reduce((a, b) => a * b, 1);
      return result;
    }, 0);
  }
}
