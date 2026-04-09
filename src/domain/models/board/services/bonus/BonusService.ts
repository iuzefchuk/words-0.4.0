import Board from '@/domain/models/board/Board.ts';
import { BoardType, Bonus } from '@/domain/models/board/enums.ts';
import { BonusDistribution, Cell } from '@/domain/models/board/types.ts';
import shuffleWithFisherYates from '@/shared/shuffleWithFisherYates.ts';

export default class BonusService {
  static createBonusDistribution(type: BoardType, randomizer?: () => number): BonusDistribution {
    return type === BoardType.Classic ? this.createClassicDistribution() : this.createRandomDistribution(randomizer);
  }

  private static createClassicDistribution(): BonusDistribution {
    return new Map([
      ...[7, 16, 28, 36, 38, 66, 68, 92, 94, 100, 102, 105, 119, 122, 124, 130, 132, 156, 158, 186, 188, 196, 208, 217].map(
        int => [int as Cell, Bonus.DoubleLetter] as const,
      ),
      ...[0, 14, 20, 24, 48, 56, 76, 80, 84, 88, 136, 140, 144, 148, 168, 176, 200, 204, 210, 224].map(
        int => [int as Cell, Bonus.TripleLetter] as const,
      ),
      ...[32, 42, 52, 64, 70, 108, 116, 154, 160, 172, 182, 192].map(int => [int as Cell, Bonus.DoubleWord] as const),
      ...[4, 10, 60, 74, 150, 164, 214, 220].map(int => [int as Cell, Bonus.TripleWord] as const),
    ]);
  }

  private static createRandomDistribution(randomizer?: () => number): BonusDistribution {
    const classicMap = this.createClassicDistribution();
    const counts = [
      {
        bonus: Bonus.DoubleLetter,
        count: [...classicMap.values()].filter(bonus => bonus === Bonus.DoubleLetter).length,
      },
      {
        bonus: Bonus.TripleLetter,
        count: [...classicMap.values()].filter(bonus => bonus === Bonus.TripleLetter).length,
      },
      {
        bonus: Bonus.DoubleWord,
        count: [...classicMap.values()].filter(bonus => bonus === Bonus.DoubleWord).length,
      },
      {
        bonus: Bonus.TripleWord,
        count: [...classicMap.values()].filter(bonus => bonus === Bonus.TripleWord).length,
      },
    ];
    const availableCells = Board.CELLS_BY_INDEX.filter(cell => cell !== Board.CENTER_CELL);
    shuffleWithFisherYates({
      array: availableCells,
      ...(randomizer && { randomizer }),
    });
    const result = new Map<Cell, Bonus>();
    let offset = 0;
    for (const { bonus, count } of counts)
      for (let i = 0; i < count; i++) {
        const cell = availableCells[offset++];
        if (cell === undefined) throw new ReferenceError('Cell must be defined');
        result.set(cell, bonus);
      }
    return result;
  }
}
