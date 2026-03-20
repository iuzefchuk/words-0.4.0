import type { GameTile } from '@/application/Game.ts';
import MatchStore from '@/gui/stores/MatchStore.ts';

export type OutlineGroup = { row: number; col: number; rowSpan: number; colSpan: number };

type CellKey = string;

export default class UseOutline {
  private readonly matchStore = MatchStore.INSTANCE();

  collectGroups(tiles: ReadonlyArray<GameTile>): ReadonlyArray<OutlineGroup> {
    const cells = this.collectCells(tiles);
    if (cells.size === 0) return [];
    const visited = new Set<CellKey>();
    const groups: Array<OutlineGroup> = [];
    for (const key of cells) {
      if (visited.has(key)) continue;
      groups.push(this.floodFill(key, cells, visited));
    }
    return groups;
  }

  private collectCells(tiles: ReadonlyArray<GameTile>): Set<CellKey> {
    const cells = new Set<CellKey>();
    for (const tile of tiles) {
      const cell = this.matchStore.findCellWithTile(tile);
      if (cell === undefined) continue;
      cells.add(this.toCellKey(this.matchStore.getCellRowIndex(cell), this.matchStore.getCellColumnIndex(cell)));
    }
    return cells;
  }

  private floodFill(start: CellKey, cells: Set<CellKey>, visited: Set<CellKey>): OutlineGroup {
    const queue = [start];
    visited.add(start);
    let minRow = Infinity,
      maxRow = -Infinity,
      minCol = Infinity,
      maxCol = -Infinity;
    while (queue.length > 0) {
      const [r, c] = queue.pop()!.split(',').map(Number);
      minRow = Math.min(minRow, r);
      maxRow = Math.max(maxRow, r);
      minCol = Math.min(minCol, c);
      maxCol = Math.max(maxCol, c);
      for (const [dr, dc] of [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ]) {
        const neighbor = this.toCellKey(r + dr, c + dc);
        if (cells.has(neighbor) && !visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
    return { row: minRow, col: minCol, rowSpan: maxRow - minRow + 1, colSpan: maxCol - minCol + 1 };
  }

  private toCellKey(row: number, col: number): CellKey {
    return `${row},${col}`;
  }
}
