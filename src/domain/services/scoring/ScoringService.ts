import { GameCell, GamePlacement, GameTile } from '@/domain/types/index.ts';

export default class ScoringService {
  static execute(
    placements: ReadonlyArray<GamePlacement>,
    newCells: ReadonlySet<GameCell>,
    getTilePoints: (tile: GameTile) => number,
    getMultiplierForLetter: (cell: GameCell) => number,
    getMultiplierForWord: (cell: GameCell) => number,
  ): number {
    let totalScore = 0;
    for (const placement of placements) {
      let score = 0;
      let multiplier = 1;
      for (const { cell, tile } of placement) {
        const tileIsNew = newCells.has(cell);
        score += getTilePoints(tile) * (tileIsNew ? getMultiplierForLetter(cell) : 1);
        multiplier *= tileIsNew ? getMultiplierForWord(cell) : 1;
      }
      totalScore += score * multiplier;
    }
    return totalScore;
  }
}
