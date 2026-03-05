import { CellIndex, Layout } from '@/domain/Layout/types/shared.ts';
import { Turnkeeper } from '@/domain/Turnkeeper/types/shared.ts';

export default class AnchorCellFinder {
  constructor(
    private readonly layout: Layout,
    private readonly turnkeeper: Turnkeeper,
  ) {}

  execute(): ReadonlySet<CellIndex> {
    return new Set(this.layout.cells.filter((cell: CellIndex) => this.isAnchor(cell)));
  }

  private isAnchor(cell: CellIndex): boolean {
    const isCenter = this.layout.isCellCenter(cell);
    if (this.turnkeeper.historyIsEmpty) return isCenter;
    const isConnected = this.turnkeeper.isCellConnected(cell);
    if (isConnected) return false;
    const hasUsedAdjacentCells = this.layout
      .findAdjacentCells(cell)
      .some((adjacentCell: CellIndex) => this.turnkeeper.isCellConnected(adjacentCell));
    return isCenter || hasUsedAdjacentCells;
  }
}
