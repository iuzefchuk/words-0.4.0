import { CellIndex } from '@/domain/models/Board.ts';
import { TileId } from '@/domain/models/Inventory.ts';
import { PlacementLinks } from '@/domain/models/TurnHistory.ts';

export default class ScoreCalculator {
  static execute(
    allPlacementLinks: ReadonlyArray<PlacementLinks>,
    newCells: ReadonlySet<CellIndex>,
    getTilePoints: (tile: TileId) => number,
    getLetterMultiplier: (cell: CellIndex) => number,
    getWordMultiplier: (cell: CellIndex) => number,
  ): number {
    let totalScore = 0;
    for (const placementLinks of allPlacementLinks) {
      let score = 0;
      let multiplier = 1;
      for (const { cell, tile } of placementLinks) {
        const tileIsNew = newCells.has(cell);
        score += getTilePoints(tile) * (tileIsNew ? getLetterMultiplier(cell) : 1);
        multiplier *= tileIsNew ? getWordMultiplier(cell) : 1;
      }
      totalScore += score * multiplier;
    }
    return totalScore;
  }
}
