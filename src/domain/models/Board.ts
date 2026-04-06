import { TileId } from '@/domain/models/Inventory.ts';
import shuffleWithFisherYates from '@/shared/shuffleWithFisherYates.ts';

export enum Axis {
  X = 'X',
  Y = 'Y',
}

export enum Bonus {
  DoubleLetter = 'DoubleLetter',
  DoubleWord = 'DoubleWord',
  TripleLetter = 'TripleLetter',
  TripleWord = 'TripleWord',
}

export enum BonusDistribution {
  Classic = 'Classic',
  Random = 'Random',
}

export type AnchorCoordinates = { readonly axis: Axis; readonly cell: CellIndex };

export type BoardSnapshot = {
  readonly layout: LayoutSnapshot;
  readonly tileByCell: Map<CellIndex, TileId>;
};

export type BoardView = {
  readonly bonusDistribution: BonusDistribution;
  readonly cells: ReadonlyArray<CellIndex>;
  readonly cellsPerAxis: number;
  findCellByTile(tile: TileId): CellIndex | undefined;
  findTileByCell(cell: CellIndex): TileId | undefined;
  getBonus(cell: CellIndex): Bonus | null;
  getIndexInColumn(cell: CellIndex): number;
  getIndexInRow(cell: CellIndex): number;
  isCellCenter(cell: CellIndex): boolean;
  isTilePlaced(tile: TileId): boolean;
};

export type CellIndex = Brand<number, 'CellIndex'>;

export type LayoutSnapshot = {
  readonly bonusByCell: ReadonlyMap<CellIndex, Bonus>;
  readonly bonusDistribution: BonusDistribution;
};

export type Link = { readonly cell: CellIndex; readonly tile: TileId };

export type Placement = ReadonlyArray<Link>;

class Layout {
  private static readonly CELLS_PER_AXIS = 15;

  private static readonly TOTAL_CELLS = Layout.CELLS_PER_AXIS ** 2;

  private static readonly CELL_BY_INDEX: ReadonlyArray<CellIndex> = Array.from({ length: Layout.TOTAL_CELLS }, (_, i) => i as CellIndex);

  private static readonly CENTER_CELL: CellIndex = (() => {
    const mid = Math.floor(Layout.CELLS_PER_AXIS / 2);
    return (mid * Layout.CELLS_PER_AXIS + mid) as CellIndex;
  })();

  get cells(): ReadonlyArray<CellIndex> {
    return Layout.CELL_BY_INDEX;
  }

  get cellsPerAxis(): number {
    return Layout.CELLS_PER_AXIS;
  }

  get snapshot(): LayoutSnapshot {
    return {
      bonusByCell: new Map(this.bonusByCell),
      bonusDistribution: this.bonusDistribution,
    };
  }

  private constructor(
    private readonly bonusByCell: ReadonlyMap<CellIndex, Bonus>,
    readonly bonusDistribution: BonusDistribution,
  ) {}

  static create(bonusDistribution: BonusDistribution): Layout {
    const bonusByCell = bonusDistribution === BonusDistribution.Classic ? Layout.createClassicBonusMap() : Layout.createRandomBonusMap();
    return new Layout(bonusByCell, bonusDistribution);
  }

  static getOppositeAxis(axis: Axis): Axis {
    return axis === Axis.X ? Axis.Y : Axis.X;
  }

  static isCellPositionOnLeftEdge(cellPosition: number): boolean {
    return cellPosition === 0;
  }

  static isCellPositionOnRightEdge(cellPosition: number): boolean {
    return cellPosition === Layout.CELLS_PER_AXIS - 1;
  }

  static restoreFromSnapshot(snapshot: LayoutSnapshot): Layout {
    return new Layout(snapshot.bonusByCell, snapshot.bonusDistribution);
  }

  private static createClassicBonusMap(): ReadonlyMap<CellIndex, Bonus> {
    return new Map([
      ...[7, 16, 28, 36, 38, 66, 68, 92, 94, 100, 102, 105, 119, 122, 124, 130, 132, 156, 158, 186, 188, 196, 208, 217].map(
        int => [int as CellIndex, Bonus.DoubleLetter] as const,
      ),
      ...[0, 14, 20, 24, 48, 56, 76, 80, 84, 88, 136, 140, 144, 148, 168, 176, 200, 204, 210, 224].map(
        int => [int as CellIndex, Bonus.TripleLetter] as const,
      ),
      ...[32, 42, 52, 64, 70, 108, 116, 154, 160, 172, 182, 192].map(int => [int as CellIndex, Bonus.DoubleWord] as const),
      ...[4, 10, 60, 74, 150, 164, 214, 220].map(int => [int as CellIndex, Bonus.TripleWord] as const),
    ]);
  }

  private static createRandomBonusMap(): ReadonlyMap<CellIndex, Bonus> {
    const classicMap = Layout.createClassicBonusMap();
    const counts = [
      {
        bonus: Bonus.DoubleLetter,
        count: [...classicMap.values()].filter(bonus => bonus === Bonus.DoubleLetter).length,
      },
      {
        bonus: Bonus.TripleLetter,
        count: [...classicMap.values()].filter(bonus => bonus === Bonus.TripleLetter).length,
      },
      {
        bonus: Bonus.DoubleWord,
        count: [...classicMap.values()].filter(bonus => bonus === Bonus.DoubleWord).length,
      },
      {
        bonus: Bonus.TripleWord,
        count: [...classicMap.values()].filter(bonus => bonus === Bonus.TripleWord).length,
      },
    ];
    const availableCells = Layout.CELL_BY_INDEX.filter(cell => cell !== Layout.CENTER_CELL);
    shuffleWithFisherYates(availableCells);
    const result = new Map<CellIndex, Bonus>();
    let offset = 0;
    for (const { bonus, count } of counts)
      for (let i = 0; i < count; i++) {
        const cell = availableCells[offset++];
        if (cell === undefined) throw new ReferenceError('Cell must be defined');
        result.set(cell, bonus);
      }
    return result;
  }

  getAdjacentCells(cell: CellIndex): ReadonlyArray<CellIndex> {
    this.validateCell(cell);
    const result: Array<CellIndex> = [];
    const row = this.getIndexInRow(cell);
    const column = this.getIndexInColumn(cell);
    if (column > 0) result.push((cell - 1) as CellIndex);
    if (column < Layout.CELLS_PER_AXIS - 1) result.push((cell + 1) as CellIndex);
    if (row > 0) result.push((cell - Layout.CELLS_PER_AXIS) as CellIndex);
    if (row < Layout.CELLS_PER_AXIS - 1) result.push((cell + Layout.CELLS_PER_AXIS) as CellIndex);
    return result;
  }

  getAxisCells(coords: AnchorCoordinates): ReadonlyArray<CellIndex> {
    const { axis, cell } = coords;
    this.validateCell(cell);
    return Array.from(
      { length: Layout.CELLS_PER_AXIS },
      (_, i) => (axis === Axis.X ? cell - this.getIndexInColumn(cell) + i : this.getIndexInColumn(cell) + i * Layout.CELLS_PER_AXIS) as CellIndex,
    );
  }

  getBonus(cell: CellIndex): Bonus | null {
    this.validateCell(cell);
    return this.bonusByCell.get(cell) ?? null;
  }

  getIndexInColumn(cell: CellIndex): number {
    return cell % Layout.CELLS_PER_AXIS;
  }

  getIndexInRow(cell: CellIndex): number {
    return Math.floor(cell / Layout.CELLS_PER_AXIS);
  }

  getMultiplierForLetter(cell: CellIndex): number {
    this.validateCell(cell);
    const bonus = this.getBonus(cell);
    if (bonus === Bonus.DoubleLetter) return 2;
    if (bonus === Bonus.TripleLetter) return 3;
    return 1;
  }

  getMultiplierForWord(cell: CellIndex): number {
    this.validateCell(cell);
    const bonus = this.getBonus(cell);
    if (bonus === Bonus.DoubleWord) return 2;
    if (bonus === Bonus.TripleWord) return 3;
    return 1;
  }

  isCellCenter(cell: CellIndex): boolean {
    this.validateCell(cell);
    return cell === Layout.CENTER_CELL;
  }

  validateCell(cell: CellIndex): void {
    if (cell < 0 || cell >= Layout.TOTAL_CELLS) throw new RangeError('Cell out of bounds');
  }
}

export default class Board {
  private static readonly DEFAULT_AXIS = Axis.X;

  get bonusDistribution(): BonusDistribution {
    return this.layout.bonusDistribution;
  }

  get cells(): ReadonlyArray<CellIndex> {
    return this.layout.cells;
  }

  get cellsPerAxis(): number {
    return this.layout.cellsPerAxis;
  }

  get snapshot(): BoardSnapshot {
    return {
      layout: this.layout.snapshot,
      tileByCell: new Map(this.tileByCell),
    };
  }

  private constructor(
    private readonly tileByCell: Map<CellIndex, TileId>,
    private readonly cellByTile: Map<TileId, CellIndex>,
    private layout: Layout,
  ) {}

  static clone(board: Board): Board {
    return new Board(new Map(board.tileByCell), new Map(board.cellByTile), board.layout);
  }

  static create(distribution: BonusDistribution = BonusDistribution.Classic): Board {
    const layout = Layout.create(distribution);
    return new Board(new Map(), new Map(), layout);
  }

  static restoreFromSnapshot(snapshot: BoardSnapshot): Board {
    const layout = Layout.restoreFromSnapshot(snapshot.layout);
    const board = new Board(new Map(), new Map(), layout);
    snapshot.tileByCell.forEach((tile, cell) => board.placeTile(cell, tile));
    return board;
  }

  calculateAxis(cells: ReadonlyArray<CellIndex>): Axis {
    let normalizedSequence = cells;
    if (cells.length === 1) {
      const [firstCell] = cells;
      if (firstCell === undefined) throw new ReferenceError('First cell must be defined');
      const connectedAdjacents = this.getAdjacentCells(firstCell).filter(cell => this.isCellOccupied(cell));
      const firstConnectedAdjacent = connectedAdjacents[0];
      normalizedSequence = !firstConnectedAdjacent ? [] : [firstConnectedAdjacent, firstCell];
    }
    if (normalizedSequence.length === 0) return Board.DEFAULT_AXIS;
    const [firstIndex] = normalizedSequence;
    if (firstIndex === undefined) throw new ReferenceError('First index must be defined');
    const firstColumn = this.getIndexInColumn(firstIndex);
    const isVertical = normalizedSequence.every(cell => this.getIndexInColumn(cell) === firstColumn);
    return isVertical ? Axis.Y : Axis.X;
  }

  changeBonusDistribution(distribution: BonusDistribution): void {
    this.layout = Layout.create(distribution);
  }

  findCellByTile(tile: TileId): CellIndex | undefined {
    return this.cellByTile.get(tile);
  }

  findTileByCell(cell: CellIndex): TileId | undefined {
    return this.tileByCell.get(cell);
  }

  getAdjacentCells(cell: CellIndex): ReadonlyArray<CellIndex> {
    return this.layout.getAdjacentCells(cell);
  }

  getAnchorCells(historyHasPriorTurns: boolean): ReadonlySet<CellIndex> {
    return new Set(
      this.layout.cells.filter((cell: CellIndex) => {
        const isCenter = this.layout.isCellCenter(cell);
        if (!historyHasPriorTurns) return isCenter;
        if (this.isCellOccupied(cell)) return false;
        const hasUsedAdjacentCells = this.layout.getAdjacentCells(cell).some((adjacentCell: CellIndex) => this.isCellOccupied(adjacentCell));
        return hasUsedAdjacentCells;
      }),
    );
  }

  getAxisCells(coords: AnchorCoordinates): ReadonlyArray<CellIndex> {
    return this.layout.getAxisCells(coords);
  }

  getBonus(cell: CellIndex): Bonus | null {
    return this.layout.getBonus(cell);
  }

  getIndexInColumn(cell: CellIndex): number {
    return this.layout.getIndexInColumn(cell);
  }

  getIndexInRow(cell: CellIndex): number {
    return this.layout.getIndexInRow(cell);
  }

  getMultiplierForLetter(cell: CellIndex): number {
    return this.layout.getMultiplierForLetter(cell);
  }

  getMultiplierForWord(cell: CellIndex): number {
    return this.layout.getMultiplierForWord(cell);
  }

  getOppositeAxis(axis: Axis): Axis {
    return Layout.getOppositeAxis(axis);
  }

  isCellCenter(cell: CellIndex): boolean {
    return this.layout.isCellCenter(cell);
  }

  isCellOccupied(cell: CellIndex): boolean {
    return this.tileByCell.has(cell);
  }

  isCellPositionOnLeftEdge(cellPosition: number): boolean {
    return Layout.isCellPositionOnLeftEdge(cellPosition);
  }

  isCellPositionOnRightEdge(cellPosition: number): boolean {
    return Layout.isCellPositionOnRightEdge(cellPosition);
  }

  isTilePlaced(tile: TileId): boolean {
    return this.cellByTile.has(tile);
  }

  placeTile(cell: CellIndex, tile: TileId): void {
    this.layout.validateCell(cell);
    if (this.tileByCell.has(cell)) throw new Error(`Cell ${cell} is already occupied`);
    if (this.cellByTile.has(tile)) throw new Error(`Tile ${tile} is already placed on the board`);
    this.tileByCell.set(cell, tile);
    this.cellByTile.set(tile, cell);
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

  undoPlaceTile(tile: TileId): void {
    const cell = this.cellByTile.get(tile);
    if (cell === undefined) throw new Error(`Tile ${tile} is not on the board`);
    this.tileByCell.delete(cell);
    this.cellByTile.delete(tile);
  }
}
