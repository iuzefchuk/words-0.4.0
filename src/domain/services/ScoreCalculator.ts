import { CellIndex } from '@/domain/models/Board.ts';
import { TileId } from '@/domain/models/Inventory.ts';
import { Placement } from '@/domain/models/TurnHistory.ts';

export default class ScoreCalculator {
  static execute(
    placements: ReadonlyArray<Placement>,
    newCells: ReadonlySet<CellIndex>,
    getTilePoints: (tile: TileId) => number,
    getLetterMultiplier: (cell: CellIndex) => number,
    getWordMultiplier: (cell: CellIndex) => number,
  ): number {
    let totalScore = 0;
    for (const placement of placements) {
      let placementScore = 0;
      let placementMultiplier = 1;
      for (const { cell, tile } of placement) {
        const tileIsNew = newCells.has(cell);
        placementScore += getTilePoints(tile) * (tileIsNew ? getLetterMultiplier(cell) : 1);
        placementMultiplier *= tileIsNew ? getWordMultiplier(cell) : 1;
      }
      totalScore += placementScore * placementMultiplier;
    }
    return totalScore;
  }
}
