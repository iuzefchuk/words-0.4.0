import { getRandomInt, shuffleArrayWithFisherYates } from '@/shared/helpers.js';
import { Axis, CellIndex, Layout } from '../Layout/Layout.js';
import { TileId } from '../Inventory.js';
import { Placement, TurnInput, TurnManager } from './Turn.js';
import { LayoutCellUsabilityCalculator } from '../Layout/LayoutCellUsabilityCalculator.js';
import { LayoutSnippetCreator } from '../Layout/LayoutSnippetCreator.js';

export class TurnInputGenerator {
  private static readonly maxAttempts = 1000;

  constructor(
    private readonly layout: Layout,
    private readonly turnManager: TurnManager,
  ) {}

  generate(args: { playerTiles: ReadonlyArray<TileId> }): TurnInput | null {
    const { playerTiles } = args;
    if (playerTiles.length === 0) return null;
    for (let i = 0; i < TurnInputGenerator.maxAttempts; i++) {
      const generationResult = this.createRandomInitData(args);
      if (generationResult) return generationResult;
    }
    return null;
  }

  private createRandomInitData(args: { playerTiles: ReadonlyArray<TileId> }): TurnInput | null {
    const initPlacement = this.createInitPlacement(args);
    if (initPlacement === null) return null;
    return { initPlacement };
  }

  private createInitPlacement(args: { playerTiles: ReadonlyArray<TileId> }): Placement | null {
    const { playerTiles } = args;
    const placementLength = getRandomInt({ from: 1, to: playerTiles.length });
    const cells = this.createInitCells({ length: placementLength });
    if (cells === null) return null;
    const randomizedPlayerTiles = shuffleArrayWithFisherYates([...playerTiles]);

    return cells.map((cell: CellIndex, idx: number) => ({ cell, tile: randomizedPlayerTiles[idx] }));
  }

  private createInitCells({ length }: { length: number }): ReadonlyArray<CellIndex> | null {
    const axis = this.createRandomAxis();
    const targetCell = this.findRandomTargetCell();
    if (targetCell === null) return null;
    const snippets = new LayoutSnippetCreator(this.turnManager).create({
      cells: this.layout.getAxisCells({ axis, targetCell }),
      targetCell,
      maxLength: length,
    });
    if (snippets.length === 0) return null;
    return snippets[getRandomInt({ to: snippets.length - 1 })];
  }

  private createRandomAxis(): Axis {
    const axisValues = Object.values(Axis);
    return axisValues[getRandomInt({ to: axisValues.length - 1 })];
  }

  private findRandomTargetCell(): CellIndex | null {
    const availableCells = new LayoutCellUsabilityCalculator(this.layout, this.turnManager).getAllUsableAsFirst();
    if (availableCells.length === 0) return null;
    return availableCells[getRandomInt({ to: availableCells.length - 1 })];
  }
}
