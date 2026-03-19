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

export type CellIndex = Brand<number, 'CellIndex'>;
export type AnchorCoordinates = { readonly axis: Axis; readonly cell: CellIndex };
export type Link = { readonly cell: CellIndex; readonly tile: TileId };
export type Placement = ReadonlyArray<Link>;

export default class Board {
  private static readonly DEFAULT_AXIS = Axis.X;

  private constructor(
    private readonly tileByCell: Map<CellIndex, TileId>,
    private readonly cellByTile: Map<TileId, CellIndex>,
  ) {}

  static create(): Board {
    return new Board(new Map(), new Map());
  }

  static hydrate(data: unknown): Board {
    return Object.setPrototypeOf(data, Board.prototype);
  }

  get cells(): ReadonlyArray<CellIndex> {
    return Layout.cells;
  }

  isCellCenter(cell: CellIndex): boolean {
    return Layout.isCellCenter(cell);
  }

  getBonusForCell(cell: CellIndex): Bonus | null {
    return Layout.getBonusForCell(cell);
  }

  getLetterMultiplier(cell: CellIndex): number {
    return Layout.getLetterMultiplier(cell);
  }

  getWordMultiplier(cell: CellIndex): number {
    return Layout.getWordMultiplier(cell);
  }

  getAdjacentCells(cell: CellIndex): ReadonlyArray<CellIndex> {
    return Layout.getAdjacentCells(cell);
  }

  getAxisCells(coords: AnchorCoordinates): ReadonlyArray<CellIndex> {
    return Layout.getAxisCells(coords);
  }

  getRowIndex(cell: CellIndex): number {
    return Layout.getRowIndex(cell);
  }

  getColumnIndex(cell: CellIndex): number {
    return Layout.getColumnIndex(cell);
  }

  findTopRightCell(cells: ReadonlyArray<CellIndex>): CellIndex | undefined {
    if (cells.length === 0) return undefined;
    return cells.reduce((best, current) => {
      const bestRow = Layout.getRowIndex(best);
      const currentRow = Layout.getRowIndex(current);
      if (currentRow < bestRow) return current;
      if (currentRow === bestRow && Layout.getColumnIndex(current) > Layout.getColumnIndex(best)) return current;
      return best;
    });
  }

  getOppositeAxis(axis: Axis): Axis {
    return Layout.getOppositeAxis(axis);
  }

  isCellPositionOnLeftEdge(cellPosition: number): boolean {
    return Layout.isCellPositionOnLeftEdge(cellPosition);
  }

  isCellPositionOnRightEdge(cellPosition: number): boolean {
    return Layout.isCellPositionOnRightEdge(cellPosition);
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

  isTilePlaced(tile: TileId): boolean {
    return this.cellByTile.has(tile);
  }

  placeTile(cell: CellIndex, tile: TileId): void {
    Layout.validateCell(cell);
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

  resolvePlacement(tiles: ReadonlyArray<TileId>): Placement {
    return tiles
      .map(tile => {
        const cell = this.cellByTile.get(tile);
        if (cell === undefined) throw new Error(`Tile ${tile} is not placed on the board`);
        return { cell, tile };
      })
      .sort((a, b) => a.cell - b.cell);
  }

  getAnchorCells(hasPriorTurns: boolean): ReadonlySet<CellIndex> {
    return new Set(
      Layout.cells.filter((cell: CellIndex) => {
        const isCenter = Layout.isCellCenter(cell);
        if (!hasPriorTurns) return isCenter;
        if (this.isCellOccupied(cell)) return false;
        const hasUsedAdjacentCells = Layout.getAdjacentCells(cell).some((adjacentCell: CellIndex) =>
          this.isCellOccupied(adjacentCell),
        );
        return isCenter || hasUsedAdjacentCells;
      }),
    );
  }

  calculateAxis(cells: ReadonlyArray<CellIndex>): Axis {
    let normalizedSequence = cells;
    if (cells.length === 1) {
      const [firstCell] = cells;
      const connectedAdjacents = this.getAdjacentCells(firstCell).filter(cell => this.isCellOccupied(cell));
      normalizedSequence = connectedAdjacents.length === 0 ? [] : [connectedAdjacents[0], firstCell];
    }
    if (normalizedSequence.length === 0) return Board.DEFAULT_AXIS;
    const [firstIndex] = normalizedSequence;
    const firstColumn = this.getColumnIndex(firstIndex);
    const isVertical = normalizedSequence.every(cell => this.getColumnIndex(cell) === firstColumn);
    return isVertical ? Axis.Y : Axis.X;
  }
}

class Layout {
  private static readonly CELLS_PER_AXIS = 15;

  private static readonly CELLS_BY_INDEX: ReadonlyArray<CellIndex> = Array.from(
    { length: this.CELLS_PER_AXIS ** 2 },
    (_, i) => this.createCellIndex(i),
  );

  private static readonly BONUS_BY_CELL: ReadonlyMap<CellIndex, Bonus> = new Map(
    Object.values(Bonus).flatMap(bonus => {
      return {
        [Bonus.DoubleLetter]: [
          7, 16, 28, 36, 38, 66, 68, 92, 94, 100, 102, 105, 119, 122, 124, 130, 132, 156, 158, 186, 188, 196, 208, 217,
        ],
        [Bonus.TripleLetter]: [0, 14, 20, 24, 48, 56, 76, 80, 84, 88, 136, 140, 144, 148, 168, 176, 200, 204, 210, 224],
        [Bonus.DoubleWord]: [32, 42, 52, 64, 70, 108, 116, 154, 160, 172, 182, 192],
        [Bonus.TripleWord]: [4, 10, 60, 74, 150, 164, 214, 220],
      }[bonus].map(number => [this.createCellIndex(number), bonus] as const);
    }),
  );

  static isCellPositionOnLeftEdge(cellPosition: number): boolean {
    return cellPosition === 0;
  }

  static isCellPositionOnRightEdge(cellPosition: number): boolean {
    return cellPosition === this.CELLS_PER_AXIS - 1;
  }

  static isCellCenter(cell: CellIndex): boolean {
    this.validateCell(cell);
    return cell === this.centerCell;
  }

  static getBonusForCell(cell: CellIndex): Bonus | null {
    this.validateCell(cell);
    return this.BONUS_BY_CELL.get(cell) ?? null;
  }

  static getLetterMultiplier(cell: CellIndex): number {
    this.validateCell(cell);
    const bonus = this.getBonusForCell(cell);
    if (bonus === Bonus.DoubleLetter) return 2;
    if (bonus === Bonus.TripleLetter) return 3;
    return 1;
  }

  static getWordMultiplier(cell: CellIndex): number {
    this.validateCell(cell);
    const bonus = this.getBonusForCell(cell);
    if (bonus === Bonus.DoubleWord) return 2;
    if (bonus === Bonus.TripleWord) return 3;
    return 1;
  }

  static getAdjacentCells(cell: CellIndex): ReadonlyArray<CellIndex> {
    this.validateCell(cell);
    const result: Array<CellIndex> = [];
    const row = this.getRowIndex(cell);
    const column = this.getColumnIndex(cell);
    if (column > 0) result.push(this.createCellIndex(cell - 1));
    if (column < this.CELLS_PER_AXIS - 1) result.push(this.createCellIndex(cell + 1));
    if (row > 0) result.push(this.createCellIndex(cell - this.CELLS_PER_AXIS));
    if (row < this.CELLS_PER_AXIS - 1) result.push(this.createCellIndex(cell + this.CELLS_PER_AXIS));
    return result;
  }

  static getAxisCells(coords: AnchorCoordinates): ReadonlyArray<CellIndex> {
    const { axis, cell } = coords;
    this.validateCell(cell);
    return Array.from({ length: this.CELLS_PER_AXIS }, (_, i) =>
      this.createCellIndex(
        axis === Axis.X ? cell - this.getColumnIndex(cell) + i : this.getColumnIndex(cell) + i * this.CELLS_PER_AXIS,
      ),
    );
  }

  static getRowIndex(cell: CellIndex): number {
    return Math.floor(cell / this.CELLS_PER_AXIS);
  }

  static getColumnIndex(cell: CellIndex): number {
    return cell % this.CELLS_PER_AXIS;
  }

  static getOppositeAxis(axis: Axis): Axis {
    return axis === Axis.X ? Axis.Y : Axis.X;
  }

  static validateCell(cell: CellIndex): void {
    if (cell < 0 || cell >= this.CELLS_BY_INDEX.length) throw new Error('Cell out of bounds');
  }

  static get cells(): ReadonlyArray<CellIndex> {
    return this.CELLS_BY_INDEX;
  }

  private static createCellIndex(value: number): CellIndex {
    return value as CellIndex;
  }

  private static get centerCell(): CellIndex {
    const mid = Math.floor(this.CELLS_PER_AXIS / 2);
    return this.createCellIndex(mid * this.CELLS_PER_AXIS + mid);
  }
}
