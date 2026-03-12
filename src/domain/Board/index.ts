import Layout from '@/domain/Board/Layout.ts';
import { CellIndex, AnchorCoordinates } from '@/domain/Board/types.ts';
import { TileId } from '@/domain/Inventory/types.ts';
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

  // --- Geometry (delegated to Layout) ---

  get cells(): ReadonlyArray<CellIndex> {
    return this.layout.cells;
  }

  isCellCenter(cellIndex: CellIndex): boolean {
    return this.layout.isCellCenter(cellIndex);
  }

  getBonusForCell(cellIndex: CellIndex): Bonus | null {
    return this.layout.getBonusForCell(cellIndex);
  }

  getLetterMultiplier(cellIndex: CellIndex): number {
    return this.layout.getLetterMultiplier(cellIndex);
  }

  getWordMultiplier(cellIndex: CellIndex): number {
    return this.layout.getWordMultiplier(cellIndex);
  }

  getAdjacentCells(cellIndex: CellIndex): ReadonlyArray<CellIndex> {
    return this.layout.getAdjacentCells(cellIndex);
  }

  getAxisCells(coords: AnchorCoordinates): ReadonlyArray<CellIndex> {
    return this.layout.getAxisCells(coords);
  }

  getRowIndex(cellIndex: CellIndex): number {
    return this.layout.getRowIndex(cellIndex);
  }

  getColumnIndex(cellIndex: CellIndex): number {
    return this.layout.getColumnIndex(cellIndex);
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

  // --- Tile-cell mapping ---

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

  removeTile(tile: TileId): void {
    const cell = this.cellByTile.get(tile);
    if (cell !== undefined) {
      this.tileByCell.delete(cell);
      this.cellByTile.delete(tile);
    }
  }

  // --- Anchor cell computation (absorbed from AnchorCellFinder) ---

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
