import { GameCell, GameTile } from '@/application/types/index.ts';
import MainStore from '@/interface/stores/MainStore.ts';

type Location = { col: number; colSpan: number; row: number; rowSpan: number };

export default class UseTileLocator {
  private get mainStore(): ReturnType<typeof MainStore.INSTANCE> {
    return MainStore.INSTANCE();
  }

  areLocationsForSelectedTiles(locations: ReadonlyArray<Location>, idx: number): boolean {
    if (this.mainStore.currentTurnScore === undefined) return false;
    let minRow = Infinity;
    let rightmostIdx = -1;
    let rightmostEdge = -Infinity;
    for (let idx = 0; idx < locations.length; idx++) {
      const group = locations[idx];
      if (group === undefined) throw new ReferenceError(`expected location group at index ${String(idx)}, got undefined`);
      if (group.row < minRow) {
        minRow = group.row;
        rightmostIdx = idx;
        rightmostEdge = group.col + group.colSpan;
      } else if (group.row === minRow) {
        const edge = group.col + group.colSpan;
        if (edge > rightmostEdge) {
          rightmostIdx = idx;
          rightmostEdge = edge;
        }
      }
    }
    return idx === rightmostIdx;
  }

  getLocationsFor(tiles: ReadonlyArray<GameTile>): ReadonlyArray<Location> {
    const cells = this.findCellsFor(tiles);
    if (cells.size === 0) return [];
    const visited = new Set<GameCell>();
    const locations: Array<Location> = [];
    for (const cell of cells) {
      if (visited.has(cell)) continue;
      locations.push(this.calculateLocation(cell, cells, visited));
    }
    return locations;
  }

  isLocationOnRightmostColumn(locations: ReadonlyArray<Location>, idx: number): boolean {
    const group = locations[idx];
    if (group === undefined) return false;
    return group.col + group.colSpan >= this.mainStore.boardCellsPerAxis;
  }

  private calculateLocation(start: GameCell, cells: ReadonlySet<GameCell>, visited: Set<GameCell>): Location {
    const stack: Array<GameCell> = [start];
    visited.add(start);
    let minRow = Infinity;
    let maxRow = -Infinity;
    let minCol = Infinity;
    let maxCol = -Infinity;
    while (stack.length > 0) {
      const cell = stack.pop();
      if (cell === undefined) throw new ReferenceError('expected cell from traversal stack, got undefined');
      const row = this.mainStore.getCellRowIndex(cell);
      const col = this.mainStore.getCellColumnIndex(cell);
      if (row < minRow) minRow = row;
      if (row > maxRow) maxRow = row;
      if (col < minCol) minCol = col;
      if (col > maxCol) maxCol = col;
      for (const adjacent of this.mainStore.getAdjacentCells(cell)) {
        if (!cells.has(adjacent) || visited.has(adjacent)) continue;
        visited.add(adjacent);
        stack.push(adjacent);
      }
    }
    return { col: minCol, colSpan: maxCol - minCol + 1, row: minRow, rowSpan: maxRow - minRow + 1 };
  }

  private findCellsFor(tiles: ReadonlyArray<GameTile>): Set<GameCell> {
    const cells = new Set<GameCell>();
    for (const tile of tiles) {
      const cell = this.mainStore.findCellWithTile(tile);
      if (cell !== undefined) cells.add(cell);
    }
    return cells;
  }
}
