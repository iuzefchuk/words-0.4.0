import { GameTile } from '@/application/types.ts';
import MatchStore from '@/gui/stores/MatchStore.ts';

type CellKey = number;

type OutlineGroup = { col: number; colSpan: number; row: number; rowSpan: number };

export default class UseOutline {
  private get boardCellsPerAxis(): number {
    return this.matchStore.boardCellsPerAxis;
  }

  private get matchStore() {
    return MatchStore.INSTANCE();
  }

  createGroups(tiles: ReadonlyArray<GameTile>): ReadonlyArray<OutlineGroup> {
    const cells = this.collectCells(tiles);
    if (cells.size === 0) return [];
    const visited = new Set<CellKey>();
    const groups: Array<OutlineGroup> = [];
    for (const key of cells) {
      if (visited.has(key)) continue;
      groups.push(this.buildGroup(key, cells, visited));
    }
    return groups;
  }

  isTooltipRendered(groups: ReadonlyArray<OutlineGroup>, idx: number): boolean {
    if (this.matchStore.currentTurnScore === undefined) return false;
    const minRow = Math.min(...groups.map(g => g.row));
    const topRowGroups = groups.map((g, i) => ({ g, i })).filter(({ g }) => g.row === minRow);
    const rightmost = topRowGroups.reduce((a, b) => (a.g.col + a.g.colSpan > b.g.col + b.g.colSpan ? a : b));
    return idx === rightmost.i;
  }

  private boundsToGroup(bounds: ReturnType<typeof this.createBounds>): OutlineGroup {
    return {
      col: bounds.minCol,
      colSpan: bounds.maxCol - bounds.minCol + 1,
      row: bounds.minRow,
      rowSpan: bounds.maxRow - bounds.minRow + 1,
    };
  }

  private buildGroup(start: CellKey, cells: Set<CellKey>, visited: Set<CellKey>): OutlineGroup {
    const stack = [start];
    visited.add(start);
    const bounds = this.createBounds();
    while (stack.length > 0) {
      const key = stack.pop()!;
      const row = this.row(key);
      const col = this.col(key);
      this.expandBounds(bounds, row, col);
      for (const neighbor of this.getNeighborKeys(row, col)) {
        if (!cells.has(neighbor) || visited.has(neighbor)) continue;
        visited.add(neighbor);
        stack.push(neighbor);
      }
    }
    return this.boundsToGroup(bounds);
  }

  private col(key: CellKey): number {
    return key % this.boardCellsPerAxis;
  }

  private collectCells(tiles: ReadonlyArray<GameTile>): Set<CellKey> {
    const cells = new Set<CellKey>();
    for (const tile of tiles) {
      const cell = this.matchStore.findCellWithTile(tile);
      if (!cell) continue;
      const row = this.matchStore.getCellRowIndex(cell);
      const col = this.matchStore.getCellColumnIndex(cell);
      cells.add(this.toKey(row, col));
    }
    return cells;
  }

  private createBounds() {
    return {
      maxCol: -Infinity,
      maxRow: -Infinity,
      minCol: Infinity,
      minRow: Infinity,
    };
  }

  private expandBounds(bounds: ReturnType<typeof this.createBounds>, row: number, col: number) {
    bounds.minRow = Math.min(bounds.minRow, row);
    bounds.maxRow = Math.max(bounds.maxRow, row);
    bounds.minCol = Math.min(bounds.minCol, col);
    bounds.maxCol = Math.max(bounds.maxCol, col);
  }

  private getNeighborKeys(row: number, col: number): Array<CellKey> {
    return [this.toKey(row, col + 1), this.toKey(row, col - 1), this.toKey(row + 1, col), this.toKey(row - 1, col)];
  }

  private row(key: CellKey): number {
    return Math.floor(key / this.boardCellsPerAxis);
  }

  private toKey(row: number, col: number): CellKey {
    return row * this.boardCellsPerAxis + col;
  }
}
