import Layout from '@/domain/reference/Layout/Layout.ts';
import { CellIndex, AnchorCoordinates } from '@/domain/reference/Layout/types.ts';
import { TileId } from '@/domain/model/Inventory/types.ts';
import { Bonus, Axis } from '@/domain/enums.ts';

export default class Board {
  private constructor(
    private readonly layout: Layout,
    private readonly tileByCell: Map<CellIndex, TileId>,
    private readonly cellByTile: Map<TileId, CellIndex>,
  ) {}

  static create(layout: Layout): Board {
    return new Board(layout, new Map(), new Map());
  }

  get cells(): ReadonlyArray<CellIndex> {
    return this.layout.cells;
  }

  isCellCenter(cell: CellIndex): boolean {
    return this.layout.isCellCenter(cell);
  }

  getBonusForCell(cell: CellIndex): Bonus | null {
    return this.layout.getBonusForCell(cell);
  }

  getLetterMultiplier(cell: CellIndex): number {
    return this.layout.getLetterMultiplier(cell);
  }

  getWordMultiplier(cell: CellIndex): number {
    return this.layout.getWordMultiplier(cell);
  }

  getAdjacentCells(cell: CellIndex): ReadonlyArray<CellIndex> {
    return this.layout.getAdjacentCells(cell);
  }

  getAxisCells(coords: AnchorCoordinates): ReadonlyArray<CellIndex> {
    return this.layout.getAxisCells(coords);
  }

  getRowIndex(cell: CellIndex): number {
    return this.layout.getRowIndex(cell);
  }

  getColumnIndex(cell: CellIndex): number {
    return this.layout.getColumnIndex(cell);
  }

  getOppositeAxis(axis: Axis): Axis {
    return this.layout.getOppositeAxis(axis);
  }

  isCellPositionOnLeftEdge(cellPosition: number): boolean {
    return this.layout.isCellPositionOnLeftEdge(cellPosition);
  }

  isCellPositionOnRightEdge(cellPosition: number): boolean {
    return this.layout.isCellPositionOnRightEdge(cellPosition);
  }

  findTileByCell(cell: CellIndex): TileId | undefined {
    return this.tileByCell.get(cell);
  }

  findCellByTile(tile: TileId): CellIndex | undefined {
    return this.cellByTile.get(tile);
  }

  isCellOccupied(cell: CellIndex): boolean {
    return this.tileByCell.has(cell);
  }

  isTileConnected(tile: TileId): boolean {
    return this.cellByTile.has(tile);
  }

  placeTile(cell: CellIndex, tile: TileId): void {
    this.tileByCell.set(cell, tile);
    this.cellByTile.set(tile, cell);
  }

  undoPlaceTile(tile: TileId): void {
    const cell = this.cellByTile.get(tile);
    if (cell) {
      this.tileByCell.delete(cell);
      this.cellByTile.delete(tile);
    }
  }

  getAnchorCells(historyIsEmpty: boolean): ReadonlySet<CellIndex> {
    return new Set(
      this.layout.cells.filter((cell: CellIndex) => {
        const isCenter = this.layout.isCellCenter(cell);
        if (historyIsEmpty) return isCenter;
        if (this.isCellOccupied(cell)) return false;
        const hasUsedAdjacentCells = this.layout
          .getAdjacentCells(cell)
          .some((adjacentCell: CellIndex) => this.isCellOccupied(adjacentCell));
        return isCenter || hasUsedAdjacentCells;
      }),
    );
  }
}
