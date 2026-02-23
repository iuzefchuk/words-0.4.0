import { CellIndex, Axis } from '../Layout/Layout.js';
import { Inventory, TileId } from '../Inventory.js';
import { TurnComputeds, TurnState, TurnStateType, Placement, TurnInput } from './Turn.js';
import { LayoutCellUsabilityCalculator } from '../Layout/LayoutCellUsabilityCalculator.js';
import { LayoutAxisCalculator } from '../Layout/LayoutAxisCalculator.js';

type PipelineComputeds = Partial<TurnComputeds> & { placements?: ReadonlyArray<Placement> };

type PipelineContext = TurnInput & { dependencies: Dependencies } & PipelineComputeds;

type PipelineResult = ValidPipelineResult | InvalidPipelineResult;

type ValidPipelineResult = { isValid: true; context: PipelineContext };

type InvalidPipelineResult = { isValid: false; error: ValidationErrors };

enum ValidationErrors {
  NoCellsUsableAsFirst = 'error_cell_3',
  InvalidTilePlacement = 'error_tile_1',
  WordNotInDictionary = 'error_tile_4',
}

class Pipeline {
  private constructor(public result: PipelineResult) {}

  static initialize(context: PipelineContext) {
    return new this(this.passStep(context));
  }

  static passStep(context: PipelineContext): ValidPipelineResult {
    return { isValid: true, context };
  }

  static failStep(error: ValidationErrors): InvalidPipelineResult {
    return { isValid: false, error };
  }

  step(processor: (context: PipelineContext) => PipelineResult): this {
    if (this.result.isValid) this.result = processor(this.result.context);
    return this;
  }
}

export class TurnStateComputer {
  constructor(private readonly dependencies: Dependencies) {}

  compute(args: TurnInput): TurnState {
    const { result } = Pipeline.initialize({
      ...args,
      dependencies: this.dependencies,
    })
      .step(TurnStateComputer.Sequences.compute)
      .step(TurnStateComputer.Placements.compute)
      .step(TurnStateComputer.Words.compute)
      .step(TurnStateComputer.Score.compute);
    return result.isValid
      ? {
          type: TurnStateType.Valid,
          sequences: result.context.sequences!,
          score: result.context.score!,
          words: result.context.words!,
        }
      : { type: TurnStateType.Invalid, error: result.error };
  }

  static Sequences = class {
    static compute(ctx: PipelineContext): PipelineResult {
      const cellSequence = this.calculateCellSequence({ placement: ctx.initPlacement });
      const tileSequence = this.calculateTileSequence({ placement: ctx.initPlacement });
      const cellsHaveUsableFirst = this.doCellsHaveUsableFirst({ cells: cellSequence, dependencies: ctx.dependencies });
      return cellsHaveUsableFirst
        ? Pipeline.passStep({ ...ctx, sequences: { cell: cellSequence, tile: tileSequence } })
        : Pipeline.failStep(ValidationErrors.NoCellsUsableAsFirst);
    }

    private static doCellsHaveUsableFirst({
      cells,
      dependencies,
    }: {
      cells: ReadonlyArray<CellIndex>;
      dependencies: Dependencies;
    }): boolean {
      const { layout, turnManager } = dependencies;
      return cells.some(cell => new LayoutCellUsabilityCalculator(layout, turnManager).isUsableAsFirst(cell));
    }

    private static calculateCellSequence({ placement }: { placement: Placement }): ReadonlyArray<CellIndex> {
      return placement.map(placement => placement.cell);
    }

    private static calculateTileSequence({ placement }: { placement: Placement }): ReadonlyArray<TileId> {
      return placement.map(placement => placement.tile);
    }
  };

  static Placements = class {
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
        ? Pipeline.passStep({ ...ctx, placements })
        : Pipeline.failStep(ValidationErrors.InvalidTilePlacement);
    }

    private static calculatePlacements(args: {
      primaryAxis: Axis;
      sequences: { cell: ReadonlyArray<CellIndex>; tile: ReadonlyArray<TileId> };
      dependencies: Dependencies;
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
      dependencies: Dependencies;
    }): Placement {
      const { axis, targetCell, tileSequence, dependencies } = args;
      const { layout } = dependencies;
      const axisCells = layout.getAxisCells({ axis, targetCell });
      return this.calculatePlacementFromAxisCells({ axisCells, tileSequence, dependencies });
    }

    private static calculatePlacementFromAxisCells(args: {
      axisCells: ReadonlyArray<CellIndex>;
      tileSequence: ReadonlyArray<TileId>;
      dependencies: Dependencies;
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
  };

  static Words = class {
    static compute(ctx: PipelineContext): PipelineResult {
      if (!ctx.placements) throw new Error('Placements need to be computed before words');
      const { dictionary, inventory } = ctx.dependencies;
      const words = this.calculateWords({ placements: ctx.placements, inventory });
      return dictionary.hasWords(words)
        ? Pipeline.passStep({ ...ctx, words })
        : Pipeline.failStep(ValidationErrors.WordNotInDictionary);
    }

    private static calculateWords(args: {
      placements: ReadonlyArray<Placement>;
      inventory: Inventory;
    }): ReadonlyArray<string> {
      const { placements, inventory } = args;
      return placements.map(placement => placement.map(link => inventory.getTileLetter(link.tile)).join(''));
    }
  };

  static Score = class {
    static compute(ctx: PipelineContext): PipelineResult {
      if (!ctx.placements) throw new Error('Placements need to be computed before score');
      const { layout, inventory } = ctx.dependencies;
      let score = 0;
      for (const placement of ctx.placements) {
        let wordMultiplier = 1;
        let placementScore = 0;
        for (const { cell, tile } of placement) {
          const points = inventory.getTilePoints(tile) * layout.getLetterMultiplier(cell);
          placementScore += points;
          wordMultiplier *= layout.getWordMultiplier(cell);
        }
        score += placementScore * wordMultiplier;
      }
      return Pipeline.passStep({ ...ctx, score });
    }
  };
}
