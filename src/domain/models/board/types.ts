import { Axis, BoardType, Bonus } from '@/domain/models/board/enums.ts';
import { Tile } from '@/domain/models/inventory/types.ts';

export type AnchorCoordinates = { readonly axis: Axis; readonly cell: Cell };

export type BoardView = {
  readonly cells: ReadonlyArray<Cell>;
  readonly cellsPerAxis: number;
  findCellByTile(tile: Tile): Cell | undefined;
  findTileByCell(cell: Cell): Tile | undefined;
  getAdjacentCells(cell: Cell): ReadonlyArray<Cell>;
  getBonus(cell: Cell): Bonus | null;
  getCellPositionInColumn(cell: Cell): number;
  getCellPositionInRow(cell: Cell): number;
  isCellCenter(cell: Cell): boolean;
  isTilePlaced(tile: Tile): boolean;
  readonly type: BoardType;
};

export type BonusDistribution = ReadonlyMap<Cell, Bonus>;

export type Cell = Brand<number, 'Cell'>;

export type Link = { readonly cell: Cell; readonly tile: Tile };

export type Placement = ReadonlyArray<Link>;
