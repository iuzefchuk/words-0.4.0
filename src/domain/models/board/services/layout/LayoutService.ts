import { Axis } from '@/domain/models/board/enums.ts';
import { AnchorCoordinates, Cell } from '@/domain/models/board/types.ts';

export default class LayoutService {
  static readonly CELLS_PER_AXIS = 15;

  static readonly CELLS: ReadonlyArray<Cell> = Array.from({ length: this.CELLS_PER_AXIS ** 2 }, (_, idx) => idx as Cell);

  static readonly CENTER_CELL = Math.floor(this.CELLS.length / 2) as Cell;

  static readonly DEFAULT_AXIS = Axis.X;

  private static readonly AXIS_X_STEP = 1;

  private static readonly AXIS_Y_STEP = this.CELLS_PER_AXIS;

  private static readonly FIRST_CELL_POSITION = 0;

  private static readonly LAST_CELL_POSITION = this.CELLS_PER_AXIS - 1;

  private static readonly ADJACENTS_BY_CELL: ReadonlyMap<Cell, ReadonlyArray<Cell>> = (() => {
    const cache = new Map<Cell, ReadonlyArray<Cell>>();
    for (let cell = 0; cell < this.CELLS.length; cell++) {
      const col = this.getCellPositionInColumn(cell as Cell);
      const row = this.getCellPositionInRow(cell as Cell);
      const adjacents: Array<Cell> = [];
      if (col > this.FIRST_CELL_POSITION) adjacents.push((cell - this.AXIS_X_STEP) as Cell);
      if (col < this.LAST_CELL_POSITION) adjacents.push((cell + this.AXIS_X_STEP) as Cell);
      if (row > this.FIRST_CELL_POSITION) adjacents.push((cell - this.AXIS_Y_STEP) as Cell);
      if (row < this.LAST_CELL_POSITION) adjacents.push((cell + this.AXIS_Y_STEP) as Cell);
      cache.set(cell as Cell, adjacents);
    }
    return cache;
  })();

  private static readonly CELLS_BY_AXIS: ReadonlyMap<Axis, ReadonlyArray<ReadonlyArray<Cell>>> = (() => {
    const cache = new Map<Axis, ReadonlyArray<ReadonlyArray<Cell>>>();
    for (const axis of Object.values(Axis)) {
      const lines: Array<ReadonlyArray<Cell>> = [];
      for (let lineIndex = 0; lineIndex < this.CELLS_PER_AXIS; lineIndex++) {
        const cells: Array<Cell> = [];
        for (let idx = 0; idx < this.CELLS_PER_AXIS; idx++) {
          cells.push((axis === Axis.X ? lineIndex * this.CELLS_PER_AXIS + idx : lineIndex + idx * this.CELLS_PER_AXIS) as Cell);
        }
        lines.push(cells);
      }
      cache.set(axis, lines);
    }
    return cache;
  })();

  static getAdjacentCells(cell: Cell): ReadonlyArray<Cell> {
    const adjacentCells = this.ADJACENTS_BY_CELL.get(cell);
    if (adjacentCells === undefined) throw new ReferenceError(`expected adjacent cells for cell ${String(cell)}, got undefined`);
    return adjacentCells;
  }

  static getAxisCells(coords: AnchorCoordinates): ReadonlyArray<Cell> {
    const { axis, cell } = coords;
    const cellPosition = axis === Axis.X ? this.getCellPositionInRow(cell) : this.getCellPositionInColumn(cell);
    const axisCells = this.CELLS_BY_AXIS.get(axis);
    if (axisCells === undefined) throw new ReferenceError(`expected axis cells for axis ${axis}, got undefined`);
    const cells = axisCells[cellPosition];
    if (cells === undefined) throw new ReferenceError(`expected axis line at position ${String(cellPosition)}, got undefined`);
    return cells;
  }

  static getCellPositionInColumn(cell: Cell): number {
    return cell % this.CELLS_PER_AXIS;
  }

  static getCellPositionInRow(cell: Cell): number {
    return Math.floor(cell / this.CELLS_PER_AXIS);
  }

  static getOppositeAxis(axis: Axis): Axis {
    return axis === Axis.X ? Axis.Y : Axis.X;
  }

  static isCellCenter(cell: Cell): boolean {
    return cell === this.CENTER_CELL;
  }

  static isCellOnBottomEdge(cell: Cell): boolean {
    return this.isCellPositionAtAxisEnd(this.getCellPositionInRow(cell));
  }

  static isCellOnLeftEdge(cell: Cell): boolean {
    return this.isCellPositionAtAxisStart(this.getCellPositionInColumn(cell));
  }

  static isCellOnRightEdge(cell: Cell): boolean {
    return this.isCellPositionAtAxisEnd(this.getCellPositionInColumn(cell));
  }

  static isCellOnTopEdge(cell: Cell): boolean {
    return this.isCellPositionAtAxisStart(this.getCellPositionInRow(cell));
  }

  static isCellPositionAtAxisEnd(position: number): boolean {
    return position === this.LAST_CELL_POSITION;
  }

  static isCellPositionAtAxisStart(position: number): boolean {
    return position === this.FIRST_CELL_POSITION;
  }
}
