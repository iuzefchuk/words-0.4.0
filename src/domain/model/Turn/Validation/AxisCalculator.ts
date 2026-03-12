import { Axis } from '@/domain/enums.ts';
import { CellIndex } from '@/domain/reference/Layout/types.ts';
import { GameContext } from '@/domain/types.ts';

export default class AxisCalculator {
  private static readonly defaultAxis = Axis.X;

  static execute(context: GameContext, args: { cellSequence: ReadonlyArray<CellIndex> }): Axis {
    const { board } = context;
    const { cellSequence } = args;
    let normalizedSequence = cellSequence;
    if (cellSequence.length === 1) {
      const [firstCell] = cellSequence;
      const connectedAdjacents = board.getAdjacentCells(firstCell).filter(cell => board.isCellOccupied(cell));
      normalizedSequence = connectedAdjacents.length === 0 ? [] : [connectedAdjacents[0], firstCell];
    }
    if (normalizedSequence.length === 0) return this.defaultAxis;
    const [firstIndex] = normalizedSequence;
    const firstColumn = board.getColumnIndex(firstIndex);
    const isVertical = normalizedSequence.every(cell => board.getColumnIndex(cell) === firstColumn);
    return isVertical ? Axis.Y : Axis.X;
  }
}
