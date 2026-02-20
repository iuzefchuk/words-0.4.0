import { TurnManager } from '../Turn/Turn.js';
import { CellIndex, Layout } from './Layout.js';

export class LayoutCellUsabilityCalculator {
  constructor(
    private readonly layout: Layout,
    private readonly turnManager: TurnManager,
  ) {}

  isUsable(cell: CellIndex): boolean {
    return !this.turnManager.isCellConnected(cell);
  }

  isUsableAsFirst(cell: CellIndex): boolean {
    const isCenter = this.layout.isCellCenter(cell);
    if (this.turnManager.historyIsEmpty) return isCenter;
    const isUsable = this.isUsable(cell);
    if (!isUsable) return false;
    const hasUsedAdjoinedCells = this.layout
      .findAdjacentCells(cell)
      .some((adjacentCell: CellIndex) => !this.isUsable(adjacentCell));
    return isCenter || hasUsedAdjoinedCells;
  }

  getAllUsableAsFirst(): ReadonlyArray<CellIndex> {
    return this.layout.cells.filter((cell: CellIndex) => this.isUsableAsFirst(cell));
  }
}
