import { Bonus, Axis } from '@/domain/enums.ts';
import { BONUS_CELL_INDEXES } from '@/domain/reference/Layout/constants.ts';
import { CellIndex, AnchorCoordinates } from '@/domain/reference/Layout/types.ts';

export default class Layout {
  private static readonly cellsPerAxis = 15;
  private static readonly cellsByIndex: ReadonlyArray<CellIndex> = Array.from(
    { length: Layout.cellsPerAxis ** 2 },
    (_, i) => i,
  );
  private static readonly bonusByCell: ReadonlyMap<CellIndex, Bonus> = new Map(
    Object.values(Bonus).flatMap(bonus => BONUS_CELL_INDEXES[bonus].map(cellIndex => [cellIndex, bonus] as const)),
  );

  static create(): Layout {
    return new Layout();
  }

  get cells(): ReadonlyArray<CellIndex> {
    return Layout.cellsByIndex;
  }

  isCellPositionOnLeftEdge(cellPosition: number): boolean {
    return cellPosition === 0;
  }

  isCellPositionOnRightEdge(cellPosition: number): boolean {
    return cellPosition === Layout.cellsPerAxis - 1;
  }

  isCellCenter(cell: CellIndex): boolean {
    this.validateCell(cell);
    return cell === this.centerCell;
  }

  getBonusForCell(cell: CellIndex): Bonus | null {
    this.validateCell(cell);
    return Layout.bonusByCell.get(cell) ?? null;
  }

  getLetterMultiplier(cell: CellIndex): number {
    this.validateCell(cell);
    const bonus = this.getBonusForCell(cell);
    if (bonus === Bonus.DoubleLetter) return 2;
    if (bonus === Bonus.TripleLetter) return 3;
    return 1;
  }

  getWordMultiplier(cell: CellIndex): number {
    this.validateCell(cell);
    const bonus = this.getBonusForCell(cell);
    if (bonus === Bonus.DoubleWord) return 2;
    if (bonus === Bonus.TripleWord) return 3;
    return 1;
  }

  getAdjacentCells(cell: CellIndex): ReadonlyArray<CellIndex> {
    this.validateCell(cell);
    const result: Array<CellIndex> = [];
    const row = this.getRowIndex(cell);
    const column = this.getColumnIndex(cell);
    if (column > 0) result.push(cell - 1);
    if (column < Layout.cellsPerAxis - 1) result.push(cell + 1);
    if (row > 0) result.push(cell - Layout.cellsPerAxis);
    if (row < Layout.cellsPerAxis - 1) result.push(cell + Layout.cellsPerAxis);
    return result;
  }

  getAxisCells(coords: AnchorCoordinates): ReadonlyArray<CellIndex> {
    const { axis, cell } = coords;
    this.validateCell(cell);
    return Array.from({ length: Layout.cellsPerAxis }, (_, i) =>
      axis === Axis.X ? cell - this.getColumnIndex(cell) + i : this.getColumnIndex(cell) + i * Layout.cellsPerAxis,
    );
  }

  getRowIndex(cell: CellIndex): number {
    return Math.floor(cell / Layout.cellsPerAxis);
  }

  getColumnIndex(cell: CellIndex): number {
    return cell % Layout.cellsPerAxis;
  }

  getOppositeAxis(axis: Axis): Axis {
    return axis === Axis.X ? Axis.Y : Axis.X;
  }

  validateCell(cell: CellIndex): void {
    if (cell < 0 || cell >= Layout.cellsByIndex.length) throw new Error('Cell out of bounds');
  }

  private get centerCell(): CellIndex {
    const mid = Math.floor(Layout.cellsPerAxis / 2);
    return mid * Layout.cellsPerAxis + mid;
  }
}
