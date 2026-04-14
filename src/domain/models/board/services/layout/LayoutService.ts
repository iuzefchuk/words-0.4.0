import { Axis } from '@/domain/models/board/enums.ts';
import { AnchorCoordinates, Cell } from '@/domain/models/board/types.ts';

export default class LayoutService {
  static readonly CELLS_PER_AXIS = 15;

  static readonly TOTAL_CELLS = this.CELLS_PER_AXIS ** 2;

  static readonly CENTER_CELL = Math.floor(this.TOTAL_CELLS / 2) as Cell;

  private static readonly AXIS_CELLS_CACHE: ReadonlyMap<Axis, ReadonlyArray<ReadonlyArray<Cell>>> = (() => {
    const cache = new Map<Axis, ReadonlyArray<ReadonlyArray<Cell>>>();
    for (const axis of Object.values(Axis)) {
      const lines: Array<ReadonlyArray<Cell>> = [];
      for (let lineIndex = 0; lineIndex < LayoutService.CELLS_PER_AXIS; lineIndex++) {
        const cells: Array<Cell> = [];
        for (let i = 0; i < LayoutService.CELLS_PER_AXIS; i++) {
          cells.push(
            (axis === Axis.X
              ? lineIndex * LayoutService.CELLS_PER_AXIS + i
              : lineIndex + i * LayoutService.CELLS_PER_AXIS) as Cell,
          );
        }
        lines.push(cells);
      }
      cache.set(axis, lines);
    }
    return cache;
  })();

  static calculateAdjacentCells(cell: Cell): ReadonlyArray<Cell> {
    this.validateCellBounds(cell);
    const col = cell % this.CELLS_PER_AXIS;
    const row = Math.floor(cell / this.CELLS_PER_AXIS);
    const result: Array<Cell> = [];
    if (col > 0) result.push((cell - 1) as Cell);
    if (col < this.CELLS_PER_AXIS - 1) result.push((cell + 1) as Cell);
    if (row > 0) result.push((cell - this.CELLS_PER_AXIS) as Cell);
    if (row < this.CELLS_PER_AXIS - 1) result.push((cell + this.CELLS_PER_AXIS) as Cell);
    return result;
  }

  static calculateAxisCells(coords: AnchorCoordinates): ReadonlyArray<Cell> {
    const { axis, cell } = coords;
    this.validateCellBounds(cell);
    const lineIndex = axis === Axis.X ? Math.floor(cell / this.CELLS_PER_AXIS) : cell % this.CELLS_PER_AXIS;
    return this.AXIS_CELLS_CACHE.get(axis)![lineIndex]!;
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
    return Math.floor(cell / this.CELLS_PER_AXIS) === this.CELLS_PER_AXIS - 1;
  }

  static isCellOnLeftEdge(cell: Cell): boolean {
    this.validateCellBounds(cell);
    return cell % this.CELLS_PER_AXIS === 0;
  }

  static isCellOnRightEdge(cell: Cell): boolean {
    this.validateCellBounds(cell);
    return cell % this.CELLS_PER_AXIS === this.CELLS_PER_AXIS - 1;
  }

  static isCellOnTopEdge(cell: Cell): boolean {
    this.validateCellBounds(cell);
    return Math.floor(cell / this.CELLS_PER_AXIS) === 0;
  }

  static isCellPositionAtAxisEnd(position: number): boolean {
    this.validateCellPositionBounds(position);
    return position === this.CELLS_PER_AXIS - 1;
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
