import { Axis, Bonus, Type } from '@/domain/models/board/enums.ts';
import BonusService from '@/domain/models/board/services/bonus/BonusService.ts';
import LayoutService from '@/domain/models/board/services/layout/LayoutService.ts';
import { AnchorCoordinates, BonusDistribution, Cell, Link, Placement } from '@/domain/models/board/types.ts';
import { GameTile } from '@/domain/types/index.ts';

export default class Board {
  get anchorCells(): ReadonlySet<Cell> {
    if (this.tileByCell.size === 0) return new Set([LayoutService.CENTER_CELL]);
    const result = new Set<Cell>();
    for (const cell of this.tileByCell.keys()) {
      for (const adjacent of LayoutService.getAdjacentCells(cell)) {
        if (!this.tileByCell.has(adjacent)) result.add(adjacent);
      }
    }
    return result;
  }

  get cells(): ReadonlyArray<Cell> {
    return LayoutService.CELLS;
  }

  get cellsPerAxis(): number {
    return LayoutService.CELLS_PER_AXIS;
  }

  private constructor(
    private readonly bonusByCell: BonusDistribution,
    private readonly tileByCell: Map<Cell, GameTile>,
    private readonly cellByTile: Map<GameTile, Cell>,
  ) {}

  static clone(source: Board): Board {
    return new Board(source.bonusByCell, new Map(source.tileByCell), new Map(source.cellByTile));
  }

  static create(type: Type, randomizer?: () => number): Board {
    const bonusByCell = BonusService.createDistribution(type, randomizer);
    return new Board(bonusByCell, new Map(), new Map());
  }

  buildPlacement(coords: AnchorCoordinates, tiles: ReadonlyArray<GameTile>): Placement {
    if (tiles.length === 0) throw new Error('cannot create placement from empty tiles');
    const axisCells = LayoutService.getAxisCells(coords);
    const tilesToPlace = new Set(tiles);
    let links: Array<Link> = [];
    let matchedTilesCount = 0;
    for (const cell of axisCells) {
      const tile = this.findTileByCell(cell);
      if (tile === undefined) {
        if (links.length === 0) continue;
        if (matchedTilesCount > 0) break;
        links = [];
        continue;
      }
      links.push({ cell, tile });
      if (tilesToPlace.has(tile)) matchedTilesCount++;
    }
    return matchedTilesCount === tiles.length ? links : [];
  }

  calculateAxis(cells: ReadonlyArray<Cell>): Axis | null {
    let normalizedSequence = cells;
    if (cells.length === 1) {
      const [firstCell] = cells;
      if (firstCell === undefined) throw new ReferenceError('expected first cell, got undefined');
      const firstOccupiedAdjacent = LayoutService.getAdjacentCells(firstCell).find(cell => this.isCellOccupied(cell));
      normalizedSequence = firstOccupiedAdjacent === undefined ? [] : [firstOccupiedAdjacent, firstCell];
    }
    if (normalizedSequence.length === 0) return LayoutService.DEFAULT_AXIS;
    const [firstIndex] = normalizedSequence;
    if (firstIndex === undefined) throw new ReferenceError('expected first index, got undefined');
    const firstColumn = LayoutService.getCellPositionInColumn(firstIndex);
    const isVertical = normalizedSequence.every(cell => LayoutService.getCellPositionInColumn(cell) === firstColumn);
    if (isVertical) return Axis.Y;
    const firstRow = LayoutService.getCellPositionInRow(firstIndex);
    const isHorizontal = normalizedSequence.every(cell => LayoutService.getCellPositionInRow(cell) === firstRow);
    if (isHorizontal) return Axis.X;
    return null;
  }

  findCellByTile(tile: GameTile): Cell | undefined {
    return this.cellByTile.get(tile);
  }

  findTileByCell(cell: Cell): GameTile | undefined {
    return this.tileByCell.get(cell);
  }

  getAdjacentCells(cell: Cell): ReadonlyArray<Cell> {
    return LayoutService.getAdjacentCells(cell);
  }

  getAxisCells(coords: AnchorCoordinates): ReadonlyArray<Cell> {
    return LayoutService.getAxisCells(coords);
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

  isTilePlaced(tile: GameTile): boolean {
    return this.cellByTile.has(tile);
  }

  placeTile(cell: Cell, tile: GameTile): void {
    if (this.tileByCell.has(cell)) throw new Error(`cell ${String(cell)} is already occupied`);
    if (this.cellByTile.has(tile)) throw new Error(`tile ${tile} is already placed on the board`);
    this.tileByCell.set(cell, tile);
    this.cellByTile.set(tile, cell);
  }

  resolvePlacement(tiles: ReadonlyArray<GameTile>): Placement {
    return tiles
      .map(tile => {
        const cell = this.cellByTile.get(tile);
        if (cell === undefined) throw new Error(`tile ${tile} is not placed on the board`);
        return { cell, tile };
      })
      .sort((first, second) => first.cell - second.cell);
  }

  undoPlaceTile(tile: GameTile): void {
    const cell = this.cellByTile.get(tile);
    if (cell === undefined) throw new Error(`tile ${tile} is not on the board`);
    this.tileByCell.delete(cell);
    this.cellByTile.delete(tile);
  }
}
