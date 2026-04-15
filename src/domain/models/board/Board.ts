import { Axis, BoardType, Bonus } from '@/domain/models/board/enums.ts';
import BonusService from '@/domain/models/board/services/bonus/BonusService.ts';
import LayoutService from '@/domain/models/board/services/layout/LayoutService.ts';
import { AnchorCoordinates, BonusDistribution, Cell, Link, Placement } from '@/domain/models/board/types.ts';
import { Tile } from '@/domain/models/inventory/types.ts';

export default class Board {
  static readonly CELLS_PER_AXIS = 15;

  static readonly TOTAL_CELLS = Board.CELLS_PER_AXIS ** 2;

  static readonly CELLS_BY_INDEX: ReadonlyArray<Cell> = Array.from({ length: Board.TOTAL_CELLS }, (_, i) => i as Cell);

  static readonly CENTER_CELL = Math.floor(Board.TOTAL_CELLS / 2) as Cell;

  private static readonly DEFAULT_AXIS = Axis.X;

  get cells(): ReadonlyArray<Cell> {
    return Board.CELLS_BY_INDEX;
  }

  get cellsPerAxis(): number {
    return Board.CELLS_PER_AXIS;
  }

  private constructor(
    private readonly bonusByCell: BonusDistribution,
    public readonly type: BoardType,
    private tileByCell: Map<Cell, Tile>,
    private cellByTile: Map<Tile, Cell>,
  ) {}

  static clone(source: Board): Board {
    return new Board(source.bonusByCell, source.type, new Map(source.tileByCell), new Map(source.cellByTile));
  }

  static create(type: BoardType, randomizer?: () => number): Board {
    const bonusByCell = BonusService.createBonusDistribution(type, randomizer);
    return new Board(bonusByCell, type, new Map(), new Map());
  }

  calculateAdjacentCells(cell: Cell): ReadonlyArray<Cell> {
    return LayoutService.calculateAdjacentCells(cell);
  }

  calculateAnchorCells(): ReadonlySet<Cell> {
    if (this.tileByCell.size === 0) return new Set([Board.CENTER_CELL]);
    const result = new Set<Cell>();
    for (const cell of this.tileByCell.keys()) {
      for (const adjacent of LayoutService.calculateAdjacentCells(cell)) {
        if (!this.tileByCell.has(adjacent)) result.add(adjacent);
      }
    }
    return result;
  }

  calculateAxis(cells: ReadonlyArray<Cell>): Axis {
    let normalizedSequence = cells;
    if (cells.length === 1) {
      const [firstCell] = cells;
      if (firstCell === undefined) throw new ReferenceError('First cell must be defined');
      const connectedAdjacents = LayoutService.calculateAdjacentCells(firstCell).filter(cell => this.isCellOccupied(cell));
      const firstConnectedAdjacent = connectedAdjacents[0];
      normalizedSequence = firstConnectedAdjacent === undefined ? [] : [firstConnectedAdjacent, firstCell];
    }
    if (normalizedSequence.length === 0) return Board.DEFAULT_AXIS;
    const [firstIndex] = normalizedSequence;
    if (firstIndex === undefined) throw new ReferenceError('First index must be defined');
    const firstColumn = LayoutService.getCellPositionInColumn(firstIndex);
    const isVertical = normalizedSequence.every(cell => LayoutService.getCellPositionInColumn(cell) === firstColumn);
    return isVertical ? Axis.Y : Axis.X;
  }

  calculateAxisCells(coords: AnchorCoordinates): ReadonlyArray<Cell> {
    return LayoutService.calculateAxisCells(coords);
  }

  createPlacement(coords: AnchorCoordinates, tiles: ReadonlyArray<Tile>): Placement {
    if (tiles.length === 0) throw new Error('Tiles must not be empty');
    const axisCells = LayoutService.calculateAxisCells(coords);
    const tilesToPlace = new Set(tiles);
    let links: Array<Link> = [];
    let segmentContainsTile = false;
    let matchedTilesCount = 0;
    for (const cell of axisCells) {
      const tile = this.findTileByCell(cell);
      if (!tile) {
        if (links.length === 0) continue;
        if (segmentContainsTile) break;
        links = [];
        segmentContainsTile = false;
        matchedTilesCount = 0;
        continue;
      }
      links.push({ cell, tile });
      if (tilesToPlace.has(tile)) {
        segmentContainsTile = true;
        matchedTilesCount++;
      }
    }
    const isValid = segmentContainsTile && matchedTilesCount === tiles.length;
    return isValid ? links : [];
  }

  findCellByTile(tile: Tile): Cell | undefined {
    return this.cellByTile.get(tile);
  }

  findTileByCell(cell: Cell): Tile | undefined {
    return this.tileByCell.get(cell);
  }

  getBonus(cell: Cell): Bonus | null {
    return this.bonusByCell.get(cell) ?? null;
  }

  getCellPositionInColumn(cell: Cell): number {
    return LayoutService.getCellPositionInColumn(cell);
  }

  getCellPositionInRow(cell: Cell): number {
    return LayoutService.getCellPositionInRow(cell);
  }

  getMultiplierForLetter(cell: Cell): number {
    const bonus = this.getBonus(cell);
    if (bonus === Bonus.DoubleLetter) return 2;
    if (bonus === Bonus.TripleLetter) return 3;
    return 1;
  }

  getMultiplierForWord(cell: Cell): number {
    const bonus = this.getBonus(cell);
    if (bonus === Bonus.DoubleWord) return 2;
    if (bonus === Bonus.TripleWord) return 3;
    return 1;
  }

  getOppositeAxis(axis: Axis): Axis {
    return LayoutService.getOppositeAxis(axis);
  }

  isCellCenter(cell: Cell): boolean {
    return LayoutService.isCellCenter(cell);
  }

  isCellOccupied(cell: Cell): boolean {
    return this.tileByCell.has(cell);
  }

  isCellPositionAtAxisEnd(position: number): boolean {
    return LayoutService.isCellPositionAtAxisEnd(position);
  }

  isCellPositionAtAxisStart(position: number): boolean {
    return LayoutService.isCellPositionAtAxisStart(position);
  }

  isTilePlaced(tile: Tile): boolean {
    return this.cellByTile.has(tile);
  }

  placeTile(cell: Cell, tile: Tile): void {
    if (this.tileByCell.has(cell)) throw new Error(`Cell ${cell} is already occupied`);
    if (this.cellByTile.has(tile)) throw new Error(`Tile ${tile} is already placed on the board`);
    this.tileByCell.set(cell, tile);
    this.cellByTile.set(tile, cell);
  }

  resolvePlacement(tiles: ReadonlyArray<Tile>): Placement {
    return tiles
      .map(tile => {
        const cell = this.cellByTile.get(tile);
        if (cell === undefined) throw new Error(`Tile ${tile} is not placed on the board`);
        return { cell, tile };
      })
      .sort((a, b) => a.cell - b.cell);
  }

  undoPlaceTile(tile: Tile): void {
    const cell = this.cellByTile.get(tile);
    if (cell === undefined) throw new Error(`Tile ${tile} is not on the board`);
    this.tileByCell.delete(cell);
    this.cellByTile.delete(tile);
  }
}
