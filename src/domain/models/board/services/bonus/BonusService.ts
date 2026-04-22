import { BoardType, Bonus } from '@/domain/models/board/enums.ts';
import LayoutService from '@/domain/models/board/services/layout/LayoutService.ts';
import { BonusDistribution, Cell } from '@/domain/models/board/types.ts';
import shuffleWithFisherYates from '@/shared/shuffleWithFisherYates.ts';

export default class BonusService {
  private static readonly INDEXES_BY_BONUS: ReadonlyMap<Bonus, Array<number>> = new Map([
    [
      Bonus.DoubleLetter,
      [7, 16, 28, 36, 38, 66, 68, 92, 94, 100, 102, 105, 119, 122, 124, 130, 132, 156, 158, 186, 188, 196, 208, 217],
    ],
    [Bonus.DoubleWord, [32, 42, 52, 64, 70, 108, 116, 154, 160, 172, 182, 192]],
    [Bonus.TripleLetter, [0, 14, 20, 24, 48, 56, 76, 80, 84, 88, 136, 140, 144, 148, 168, 176, 200, 204, 210, 224]],
    [Bonus.TripleWord, [4, 10, 60, 74, 150, 164, 214, 220]],
  ]);

  private static readonly CLASSIC_DISTRIBUTION: BonusDistribution = (() => {
    const result = new Map<Cell, Bonus>();
    for (const [bonus, cells] of this.INDEXES_BY_BONUS) for (const cell of cells) result.set(cell as Cell, bonus);
    return result;
  })();

  static createDistribution(type: BoardType, randomizer?: () => number): BonusDistribution {
    return type === BoardType.Classic ? this.CLASSIC_DISTRIBUTION : this.createRandomDistribution(randomizer);
  }

  private static createRandomDistribution(randomizer?: () => number): BonusDistribution {
    const availableCells = LayoutService.CELLS_BY_INDEX.filter(cell => cell !== LayoutService.CENTER_CELL);
    shuffleWithFisherYates({ array: availableCells, ...(randomizer !== undefined && { randomizer }) });
    return new Map(
      Array.from(this.CLASSIC_DISTRIBUTION.values(), (bonus, idx) => {
        const cell = availableCells[idx];
        if (cell === undefined) throw new ReferenceError(`expected cell at index ${String(idx)}, got undefined`);
        return [cell, bonus];
      }),
    );
  }
}
