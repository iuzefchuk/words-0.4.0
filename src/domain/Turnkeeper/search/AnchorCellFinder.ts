import { GameContext } from '@/domain/types.ts';
import { CellIndex } from '@/domain/Layout/types/shared.ts';

export default class AnchorCellFinder {
  static execute(context: GameContext): ReadonlySet<CellIndex> {
    const { layout, turnkeeper } = context;
    return new Set(
      layout.cells.filter((cell: CellIndex) => {
        const isCenter = layout.isCellCenter(cell);
        if (turnkeeper.historyIsEmpty) return isCenter;
        const isConnected = turnkeeper.isCellConnected(cell);
        if (isConnected) return false;
        const hasUsedAdjacentCells = layout
          .getAdjacentCells(cell)
          .some((adjacentCell: CellIndex) => turnkeeper.isCellConnected(adjacentCell));
        return isCenter || hasUsedAdjacentCells;
      }),
    );
  }
}
