import { TileId } from '@/domain/models/Inventory.ts';

export enum Bonus {
  DoubleWord = 'DoubleWord',
  TripleWord = 'TripleWord',
  DoubleLetter = 'DoubleLetter',
  TripleLetter = 'TripleLetter',
}

export enum Axis {
  X = 'X',
  Y = 'Y',
}

export type CellIndex = number;

export type AnchorCoordinates = { readonly axis: Axis; readonly cell: CellIndex };

const BONUS_CELL_INDEXES: Record<Bonus, ReadonlyArray<CellIndex>> = {
  [Bonus.DoubleLetter]: [
    7, 16, 28, 36, 38, 66, 68, 92, 94, 100, 102, 105, 119, 122, 124, 130, 132, 156, 158, 186, 188, 196, 208, 217,
  ],
  [Bonus.TripleLetter]: [0, 14, 20, 24, 48, 56, 76, 80, 84, 88, 136, 140, 144, 148, 168, 176, 200, 204, 210, 224],
  [Bonus.DoubleWord]: [32, 42, 52, 64, 70, 108, 116, 154, 160, 172, 182, 192],
  [Bonus.TripleWord]: [4, 10, 60, 74, 150, 164, 214, 220],
} as const;

class Layout {
  private static readonly cellsPerAxis = 15;
  private static readonly cellsByIndex: ReadonlyArray<CellIndex> = Array.from(
    { length: Layout.cellsPerAxis ** 2 },
    (_, i) => i,
  );
  private static readonly bonusByCell: ReadonlyMap<CellIndex, Bonus> = new Map(
    Object.values(Bonus).flatMap(bonus => BONUS_CELL_INDEXES[bonus].map(cellIndex => [cellIndex, bonus] as const)),
  );

  static create(): Layout {
    return new Layout();
  }

  get cells(): ReadonlyArray<CellIndex> {
    return Layout.cellsByIndex;
  }

  isCellPositionOnLeftEdge(cellPosition: number): boolean {
    return cellPosition === 0;
  }

  isCellPositionOnRightEdge(cellPosition: number): boolean {
    return cellPosition === Layout.cellsPerAxis - 1;
  }

  isCellCenter(cell: CellIndex): boolean {
    this.validateCell(cell);
    return cell === this.centerCell;
  }

  getBonusForCell(cell: CellIndex): Bonus | null {
    this.validateCell(cell);
    return Layout.bonusByCell.get(cell) ?? null;
  }

  getLetterMultiplier(cell: CellIndex): number {
    this.validateCell(cell);
    const bonus = this.getBonusForCell(cell);
    if (bonus === Bonus.DoubleLetter) return 2;
    if (bonus === Bonus.TripleLetter) return 3;
    return 1;
  }

  getWordMultiplier(cell: CellIndex): number {
    this.validateCell(cell);
    const bonus = this.getBonusForCell(cell);
    if (bonus === Bonus.DoubleWord) return 2;
    if (bonus === Bonus.TripleWord) return 3;
    return 1;
  }

  getAdjacentCells(cell: CellIndex): ReadonlyArray<CellIndex> {
    this.validateCell(cell);
    const result: Array<CellIndex> = [];
    const row = this.getRowIndex(cell);
    const column = this.getColumnIndex(cell);
    if (column > 0) result.push(cell - 1);
    if (column < Layout.cellsPerAxis - 1) result.push(cell + 1);
    if (row > 0) result.push(cell - Layout.cellsPerAxis);
    if (row < Layout.cellsPerAxis - 1) result.push(cell + Layout.cellsPerAxis);
    return result;
  }

  getAxisCells(coords: AnchorCoordinates): ReadonlyArray<CellIndex> {
    const { axis, cell } = coords;
    this.validateCell(cell);
    return Array.from({ length: Layout.cellsPerAxis }, (_, i) =>
      axis === Axis.X ? cell - this.getColumnIndex(cell) + i : this.getColumnIndex(cell) + i * Layout.cellsPerAxis,
    );
  }

  getRowIndex(cell: CellIndex): number {
    return Math.floor(cell / Layout.cellsPerAxis);
  }

  getColumnIndex(cell: CellIndex): number {
    return cell % Layout.cellsPerAxis;
  }

  getOppositeAxis(axis: Axis): Axis {
    return axis === Axis.X ? Axis.Y : Axis.X;
  }

  validateCell(cell: CellIndex): void {
    if (cell < 0 || cell >= Layout.cellsByIndex.length) throw new Error('Cell out of bounds');
  }

  private get centerCell(): CellIndex {
    const mid = Math.floor(Layout.cellsPerAxis / 2);
    return mid * Layout.cellsPerAxis + mid;
  }
}

export class Board {
  private static readonly layout = Layout.create();
  private static readonly defaultAxis = Axis.X;

  private constructor(
    private readonly tileByCell: Map<CellIndex, TileId>,
    private readonly cellByTile: Map<TileId, CellIndex>,
  ) {}

  static create(): Board {
    return new Board(new Map(), new Map());
  }

  get cells(): ReadonlyArray<CellIndex> {
    return Board.layout.cells;
  }

  isCellCenter(cell: CellIndex): boolean {
    return Board.layout.isCellCenter(cell);
  }

  getBonusForCell(cell: CellIndex): Bonus | null {
    return Board.layout.getBonusForCell(cell);
  }

  getLetterMultiplier(cell: CellIndex): number {
    return Board.layout.getLetterMultiplier(cell);
  }

  getWordMultiplier(cell: CellIndex): number {
    return Board.layout.getWordMultiplier(cell);
  }

  getAdjacentCells(cell: CellIndex): ReadonlyArray<CellIndex> {
    return Board.layout.getAdjacentCells(cell);
  }

  getAxisCells(coords: AnchorCoordinates): ReadonlyArray<CellIndex> {
    return Board.layout.getAxisCells(coords);
  }

  getRowIndex(cell: CellIndex): number {
    return Board.layout.getRowIndex(cell);
  }

  getColumnIndex(cell: CellIndex): number {
    return Board.layout.getColumnIndex(cell);
  }

  getOppositeAxis(axis: Axis): Axis {
    return Board.layout.getOppositeAxis(axis);
  }

  isCellPositionOnLeftEdge(cellPosition: number): boolean {
    return Board.layout.isCellPositionOnLeftEdge(cellPosition);
  }

  isCellPositionOnRightEdge(cellPosition: number): boolean {
    return Board.layout.isCellPositionOnRightEdge(cellPosition);
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
    Board.layout.validateCell(cell);
    if (this.tileByCell.has(cell)) throw new Error(`Cell ${cell} is already occupied`);
    if (this.cellByTile.has(tile)) throw new Error(`Tile ${tile} is already placed on the board`);
    this.tileByCell.set(cell, tile);
    this.cellByTile.set(tile, cell);
  }

  undoPlaceTile(tile: TileId): void {
    const cell = this.cellByTile.get(tile);
    if (cell === undefined) throw new Error(`Tile ${tile} is not on the board`);
    this.tileByCell.delete(cell);
    this.cellByTile.delete(tile);
  }

  getAnchorCells(historyIsEmpty: boolean): ReadonlySet<CellIndex> {
    return new Set(
      Board.layout.cells.filter((cell: CellIndex) => {
        const isCenter = Board.layout.isCellCenter(cell);
        if (historyIsEmpty) return isCenter;
        if (this.isCellOccupied(cell)) return false;
        const hasUsedAdjacentCells = Board.layout
          .getAdjacentCells(cell)
          .some((adjacentCell: CellIndex) => this.isCellOccupied(adjacentCell));
        return isCenter || hasUsedAdjacentCells;
      }),
    );
  }

  calculateAxis(cellSequence: ReadonlyArray<CellIndex>): Axis {
    let normalizedSequence = cellSequence;
    if (cellSequence.length === 1) {
      const [firstCell] = cellSequence;
      const connectedAdjacents = this.getAdjacentCells(firstCell).filter(cell => this.isCellOccupied(cell));
      normalizedSequence = connectedAdjacents.length === 0 ? [] : [connectedAdjacents[0], firstCell];
    }
    if (normalizedSequence.length === 0) return Board.defaultAxis;
    const [firstIndex] = normalizedSequence;
    const firstColumn = this.getColumnIndex(firstIndex);
    const isVertical = normalizedSequence.every(cell => this.getColumnIndex(cell) === firstColumn);
    return isVertical ? Axis.Y : Axis.X;
  }
}
