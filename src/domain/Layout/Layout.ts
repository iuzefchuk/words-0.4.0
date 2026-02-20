export enum Bonus {
  DoubleWord = 'DoubleWord',
  TripleWord = 'TripleWord',
  DoubleLetter = 'DoubleLetter',
  TripleLetter = 'TripleLetter',
}

const BONUS_CELL_INDEXES: Record<Bonus, ReadonlyArray<CellIndex>> = {
  [Bonus.DoubleLetter]: [
    7, 16, 28, 36, 38, 66, 68, 92, 94, 100, 102, 105, 119, 122, 124, 130, 132, 156, 158, 186, 188, 196, 208, 217,
  ],
  [Bonus.TripleLetter]: [0, 14, 20, 24, 48, 56, 76, 80, 84, 88, 136, 140, 144, 148, 168, 176, 200, 204, 210, 224],
  [Bonus.DoubleWord]: [32, 42, 52, 64, 70, 108, 116, 154, 160, 172, 182, 192],
  [Bonus.TripleWord]: [4, 10, 60, 74, 150, 164, 214, 220],
} as const;

export enum Axis {
  X = 'X',
  Y = 'Y',
}

export type CellIndex = number;

export class Layout {
  private static readonly cellsPerAxis = 15;
  private static readonly _cells: ReadonlyArray<CellIndex> = Array.from({ length: Layout.cellsPerAxis ** 2 });
  private static readonly bonusCellMap: ReadonlyMap<CellIndex, Bonus> = new Map(
    Object.values(Bonus).flatMap(bonus => BONUS_CELL_INDEXES[bonus].map(cellIndex => [cellIndex, bonus] as const)),
  );

  private constructor() {}

  static create(): Layout {
    return new Layout();
  }

  get cells(): ReadonlyArray<CellIndex> {
    return Layout._cells;
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

  getAxisCells({ axis, targetCell }: { axis: Axis; targetCell: CellIndex }): ReadonlyArray<CellIndex> {
    this.validateCellIndex(targetCell);
    return Array.from({ length: Layout.cellsPerAxis }, (_, i) =>
      axis === Axis.X
        ? targetCell - this.getColumnIndex(targetCell) + i
        : this.getColumnIndex(targetCell) + i * Layout.cellsPerAxis,
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
