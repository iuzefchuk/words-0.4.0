import { Bonus, Axis } from '@/domain/enums.js';
import { BONUS_CELL_INDEXES } from '@/domain/Layout/constants.js';
import { CellIndex, AnchorCoordinates } from '@/domain/Layout/types/shared.ts';

export default class Layout {
  private static readonly cellsPerAxis = 15;
  private static readonly _cells: ReadonlyArray<CellIndex> = Array.from({ length: Layout.cellsPerAxis ** 2 });
  private static readonly bonusCellMap: ReadonlyMap<CellIndex, Bonus> = new Map(
    Object.values(Bonus).flatMap(bonus => BONUS_CELL_INDEXES[bonus].map(cellIndex => [cellIndex, bonus] as const)),
  );

  static create(): Layout {
    return new Layout();
  }

  get cells(): ReadonlyArray<CellIndex> {
    return Layout._cells;
  }

  isCellPositionOnLeftEdge(cellPosition: number): boolean {
    return cellPosition === 0;
  }

  isCellPositionOnRightEdge(cellPosition: number): boolean {
    return cellPosition === Layout.cellsPerAxis - 1;
  }

  isCellCenter(cellIndex: CellIndex): boolean {
    this.validateCellIndex(cellIndex);
    return cellIndex === this.centerIndex;
  }

  getBonusForCell(cellIndex: CellIndex): Bonus | null {
    this.validateCellIndex(cellIndex);
    return Layout.bonusCellMap.get(cellIndex) ?? null;
  }

  getLetterMultiplier(cellIndex: CellIndex): number {
    this.validateCellIndex(cellIndex);
    const bonus = this.getBonusForCell(cellIndex);
    if (bonus === Bonus.DoubleLetter) return 2;
    if (bonus === Bonus.TripleLetter) return 3;
    return 1;
  }

  getWordMultiplier(cellIndex: CellIndex): number {
    this.validateCellIndex(cellIndex);
    const bonus = this.getBonusForCell(cellIndex);
    if (bonus === Bonus.DoubleWord) return 2;
    if (bonus === Bonus.TripleWord) return 3;
    return 1;
  }

  findAdjacentCells(cellIndex: CellIndex): ReadonlyArray<CellIndex> {
    this.validateCellIndex(cellIndex);
    const result: Array<CellIndex> = [];
    const row = this.getRowIndex(cellIndex);
    const column = this.getColumnIndex(cellIndex);
    if (column > 0) result.push(cellIndex - 1);
    if (column < Layout.cellsPerAxis - 1) result.push(cellIndex + 1);
    if (row > 0) result.push(cellIndex - Layout.cellsPerAxis);
    if (row < Layout.cellsPerAxis - 1) result.push(cellIndex + Layout.cellsPerAxis);
    return result;
  }

  getAxisCells({ axis, index }: AnchorCoordinates): ReadonlyArray<CellIndex> {
    this.validateCellIndex(index);
    return Array.from({ length: Layout.cellsPerAxis }, (_, i) =>
      axis === Axis.X ? index - this.getColumnIndex(index) + i : this.getColumnIndex(index) + i * Layout.cellsPerAxis,
    );
  }

  getRowIndex(cellIndex: CellIndex): number {
    return Math.floor(cellIndex / Layout.cellsPerAxis);
  }

  getColumnIndex(cellIndex: CellIndex): number {
    return cellIndex % Layout.cellsPerAxis;
  }

  getOppositeAxis(axis: Axis): Axis {
    return axis === Axis.X ? Axis.Y : Axis.X;
  }

  private get centerIndex(): CellIndex {
    const mid = Math.floor(Layout.cellsPerAxis / 2);
    return mid * Layout.cellsPerAxis + mid;
  }

  private validateCellIndex(cellIndex: CellIndex): void {
    if (cellIndex < 0 || cellIndex >= Layout._cells.length) throw new Error('Cell index out of bounds');
  }
}
