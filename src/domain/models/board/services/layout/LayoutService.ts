import { Axis } from '@/domain/models/board/enums.ts';
import { AnchorCoordinates, Cell } from '@/domain/models/board/types.ts';

export default class LayoutService {
  static readonly CELLS_PER_AXIS = 15;

  static readonly TOTAL_CELLS = this.CELLS_PER_AXIS ** 2;

  static readonly CENTER_CELL = Math.floor(this.TOTAL_CELLS / 2) as Cell;

  static calculateAdjacentCells(cell: Cell): ReadonlyArray<Cell> {
    this.validateCellBounds(cell);
    const STEP_X = this.getAxisStep(Axis.X);
    const STEP_Y = this.getAxisStep(Axis.Y);
    const result: Array<Cell> = [];
    if (!this.isCellOnLeftEdge(cell)) result.push((cell - STEP_X) as Cell);
    if (!this.isCellOnRightEdge(cell)) result.push((cell + STEP_X) as Cell);
    if (!this.isCellOnTopEdge(cell)) result.push((cell - STEP_Y) as Cell);
    if (!this.isCellOnBottomEdge(cell)) result.push((cell + STEP_Y) as Cell);
    return result;
  }

  static calculateAxisCells(coords: AnchorCoordinates): ReadonlyArray<Cell> {
    const { axis, cell } = coords;
    this.validateCellBounds(cell);
    return Array.from(
      { length: this.CELLS_PER_AXIS },
      (_, i) =>
        (axis === Axis.X ? cell - this.getCellPositionInColumn(cell) + i : this.getCellPositionInColumn(cell) + i * this.CELLS_PER_AXIS) as Cell,
    );
  }

  static getAxisStep(axis: Axis): number {
    return axis === Axis.X ? 1 : this.CELLS_PER_AXIS;
  }

  static getCellPositionInColumn(cell: Cell): number {
    this.validateCellBounds(cell);
    return cell % this.CELLS_PER_AXIS;
  }

  static getCellPositionInRow(cell: Cell): number {
    this.validateCellBounds(cell);
    return Math.floor(cell / this.CELLS_PER_AXIS);
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
    const position = this.getCellPositionInRow(cell);
    return this.isCellPositionAtAxisEnd(position);
  }

  static isCellOnLeftEdge(cell: Cell): boolean {
    this.validateCellBounds(cell);
    const position = this.getCellPositionInColumn(cell);
    return this.isCellPositionAtAxisStart(position);
  }

  static isCellOnRightEdge(cell: Cell): boolean {
    this.validateCellBounds(cell);
    const position = this.getCellPositionInColumn(cell);
    return this.isCellPositionAtAxisEnd(position);
  }

  static isCellOnTopEdge(cell: Cell): boolean {
    this.validateCellBounds(cell);
    const position = this.getCellPositionInRow(cell);
    return this.isCellPositionAtAxisStart(position);
  }

  static isCellPositionAtAxisEnd(position: number): boolean {
    this.validateCellPositionBounds(position);
    return position === this.getAxisStep(Axis.Y) - this.getAxisStep(Axis.X);
  }

  static isCellPositionAtAxisStart(position: number): boolean {
    this.validateCellPositionBounds(position);
    return position === 0;
  }

  private static validateCellBounds(cell: Cell): void {
    if (cell < 0 || cell >= this.TOTAL_CELLS) throw new RangeError('Cell out of bounds');
  }

  private static validateCellPositionBounds(position: number): void {
    if (position < 0 || position >= this.CELLS_PER_AXIS) throw new RangeError('Position out of bounds');
  }
}
