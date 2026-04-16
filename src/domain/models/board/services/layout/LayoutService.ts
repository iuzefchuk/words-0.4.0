import { Axis } from '@/domain/models/board/enums.ts';
import { AnchorCoordinates, Cell } from '@/domain/models/board/types.ts';

export default class LayoutService {
  static readonly CELLS_PER_AXIS = 15;

  static readonly TOTAL_CELLS = this.CELLS_PER_AXIS ** 2;

  static readonly CENTER_CELL = Math.floor(this.TOTAL_CELLS / 2) as Cell;

  private static readonly AXIS_X_STEP = 1;

  private static readonly AXIS_Y_STEP = this.CELLS_PER_AXIS;

  private static readonly FIRST_CELL_POSITION = 0;

  private static readonly LAST_CELL_POSITION = this.CELLS_PER_AXIS - 1;

  private static readonly ADJACENT_CELLS: ReadonlyMap<Cell, ReadonlyArray<Cell>> = (() => {
    const cache = new Map<Cell, ReadonlyArray<Cell>>();
    for (let cell = 0; cell < this.TOTAL_CELLS; cell++) {
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

  private static readonly AXIS_CELLS: ReadonlyMap<Axis, ReadonlyArray<ReadonlyArray<Cell>>> = (() => {
    const cache = new Map<Axis, ReadonlyArray<ReadonlyArray<Cell>>>();
    for (const axis of Object.values(Axis)) {
      const lines: Array<ReadonlyArray<Cell>> = [];
      for (let lineIndex = 0; lineIndex < this.CELLS_PER_AXIS; lineIndex++) {
        const cells: Array<Cell> = [];
        for (let i = 0; i < this.CELLS_PER_AXIS; i++) {
          cells.push((axis === Axis.X ? lineIndex * this.CELLS_PER_AXIS + i : lineIndex + i * this.CELLS_PER_AXIS) as Cell);
        }
        lines.push(cells);
      }
      cache.set(axis, lines);
    }
    return cache;
  })();

  static calculateAdjacentCells(cell: Cell): ReadonlyArray<Cell> {
    this.validateCellBounds(cell);
    const cells = this.ADJACENT_CELLS.get(cell);
    if (cells === undefined) throw new ReferenceError('Cells have to be defined');
    return cells;
  }

  static calculateAxisCells(coords: AnchorCoordinates): ReadonlyArray<Cell> {
    const { axis, cell } = coords;
    this.validateCellBounds(cell);
    const cellPosition = axis === Axis.X ? this.getCellPositionInRow(cell) : this.getCellPositionInColumn(cell);
    const cells = this.AXIS_CELLS.get(axis);
    if (cells === undefined) throw new ReferenceError('Cells have to be defined');
    return cells[cellPosition]!;
  }

  static getCellPositionInColumn(cell: Cell): number {
    this.validateCellBounds(cell);
    return cell % this.AXIS_Y_STEP;
  }

  static getCellPositionInRow(cell: Cell): number {
    this.validateCellBounds(cell);
    return Math.floor(cell / this.AXIS_Y_STEP);
  }

  static getOppositeAxis(axis: Axis): Axis {
    return axis === Axis.X ? Axis.Y : Axis.X;
  }

  static isCellCenter(cell: Cell): boolean {
    this.validateCellBounds(cell);
    return cell === this.CENTER_CELL;
  }

  static isCellOnBottomEdge(cell: Cell): boolean {
    this.validateCellBounds(cell);
    return this.isCellPositionAtAxisEnd(this.getCellPositionInRow(cell));
  }

  static isCellOnLeftEdge(cell: Cell): boolean {
    this.validateCellBounds(cell);
    return this.isCellPositionAtAxisStart(this.getCellPositionInColumn(cell));
  }

  static isCellOnRightEdge(cell: Cell): boolean {
    this.validateCellBounds(cell);
    return this.isCellPositionAtAxisEnd(this.getCellPositionInColumn(cell));
  }

  static isCellOnTopEdge(cell: Cell): boolean {
    this.validateCellBounds(cell);
    return this.isCellPositionAtAxisStart(this.getCellPositionInRow(cell));
  }

  static isCellPositionAtAxisEnd(position: number): boolean {
    this.validateCellPositionBounds(position);
    return position === this.LAST_CELL_POSITION;
  }

  static isCellPositionAtAxisStart(position: number): boolean {
    this.validateCellPositionBounds(position);
    return position === this.FIRST_CELL_POSITION;
  }

  private static validateCellBounds(cell: Cell): void {
    if (cell < 0 || cell >= this.TOTAL_CELLS) throw new RangeError('Cell out of bounds');
  }

  private static validateCellPositionBounds(position: number): void {
    if (position < this.FIRST_CELL_POSITION || position > this.LAST_CELL_POSITION) throw new RangeError('Position out of bounds');
  }
}
