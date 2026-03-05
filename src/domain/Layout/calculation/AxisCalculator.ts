import { Axis } from '@/domain/enums.js';
import { Layout, CellIndex } from '@/domain/Layout/types/shared.ts';
import { Turnkeeper } from '@/domain/Turnkeeper/types/shared.ts';

export default class AxisCalculator {
  private static readonly defaultAxis = Axis.X;

  constructor(
    private readonly layout: Layout,
    private readonly turnkeeper: Turnkeeper,
  ) {}

  execute(cellSequence: ReadonlyArray<CellIndex>): Axis {
    const normalizedSequence =
      cellSequence.length === 1 ? this.createCellSequenceFromAdjacents({ cellIndex: cellSequence[0] }) : cellSequence;
    if (normalizedSequence.length === 0) return AxisCalculator.defaultAxis;
    const [firstIndex] = normalizedSequence;
    const firstColumn = this.layout.getColumnIndex(firstIndex);
    const isVertical = normalizedSequence.every(cell => this.layout.getColumnIndex(cell) === firstColumn);
    return isVertical ? Axis.Y : Axis.X;
  }

  private createCellSequenceFromAdjacents({ cellIndex }: { cellIndex: CellIndex }): ReadonlyArray<CellIndex> {
    const connectedAdjacents = this.layout
      .findAdjacentCells(cellIndex)
      .filter(cell => this.turnkeeper.isCellConnected(cell));
    return connectedAdjacents.length === 0 ? [] : [connectedAdjacents[0], cellIndex];
  }
}
