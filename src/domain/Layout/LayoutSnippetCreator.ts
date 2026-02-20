import { TurnManager } from '../Turn/Turn.js';
import { CellIndex } from './Layout.js';

export class LayoutSnippetCreator {
  constructor(private readonly turnManager: TurnManager) {}

  create(args: {
    cells: ReadonlyArray<CellIndex>;
    targetCell: CellIndex;
    maxLength: number;
  }): ReadonlyArray<ReadonlyArray<CellIndex>> {
    const { targetCell, maxLength } = args;
    const trimmedCells = this.trimCellsAroundTarget(args);
    const targetIndex = trimmedCells.indexOf(targetCell);
    if (targetIndex === -1) throw new Error('Target cell not in trimmed cells');
    const result: Array<Array<CellIndex>> = [];
    const minStart = Math.max(0, targetIndex - maxLength + 1);
    const maxStart = Math.min(targetIndex, trimmedCells.length - maxLength);
    for (let start = minStart; start <= maxStart; start++) {
      result.push(trimmedCells.slice(start, start + maxLength));
    }
    return result;
  }

  private trimCellsAroundTarget(args: {
    cells: ReadonlyArray<CellIndex>;
    targetCell: CellIndex;
  }): ReadonlyArray<CellIndex> {
    const { cells, targetCell } = args;
    const result: Array<CellIndex> = [];
    let containsTarget = false;
    for (const cell of cells) {
      const isEmpty = !this.turnManager.isCellConnected(cell);
      if (isEmpty) {
        result.push(cell);
        if (cell === targetCell) containsTarget = true;
        continue;
      }
      if (containsTarget) break;
      result.length = 0;
      containsTarget = false;
    }
    return result;
  }
}
