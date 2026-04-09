import Board from '@/domain/models/board/Board.ts';
import { BoardType, Bonus } from '@/domain/models/board/enums.ts';
import BonusService from '@/domain/models/board/services/bonus/BonusService.ts';
import { BonusDistribution } from '@/domain/models/board/types.ts';
import CryptoSeedingService from '@/infrastructure/services/CryptoSeedingService.ts';

function countBonuses(distribution: BonusDistribution): {
  dl: number;
  dw: number;
  tl: number;
  tw: number;
} {
  const result = { dl: 0, dw: 0, tl: 0, tw: 0 };
  for (const bonus of distribution.values()) {
    if (bonus === Bonus.DoubleLetter) result.dl++;
    else if (bonus === Bonus.TripleLetter) result.tl++;
    else if (bonus === Bonus.DoubleWord) result.dw++;
    else if (bonus === Bonus.TripleWord) result.tw++;
  }
  return result;
}

describe('BonusService', () => {
  let classicDistribution: BonusDistribution;
  let randomDistribution: BonusDistribution;

  it('has same count for different distributions', () => {
    expect(countBonuses(classicDistribution)).toEqual(countBonuses(randomDistribution));
  });

  it('excludes center cell', () => {
    const centerCell = Board.CENTER_CELL;
    expect(classicDistribution.get(centerCell)).toBeUndefined();
    expect(randomDistribution.get(centerCell)).toBeUndefined();
  });

  beforeEach(() => {
    const seedingService = new CryptoSeedingService();
    classicDistribution = BonusService.createBonusDistribution(BoardType.Classic);
    randomDistribution = BonusService.createBonusDistribution(BoardType.Random, seedingService.createRandomizer(seedingService.createSeed()));
  });
});

describe('Board using BonusService', () => {
  it('applies distribution correctly', () => {
    const seedingService = new CryptoSeedingService();
    Object.values(BoardType).forEach(type => {
      const seed = seedingService.createSeed();
      const board = Board.create(type, seedingService.createRandomizer(seed));
      const distribution = BonusService.createBonusDistribution(type, seedingService.createRandomizer(seed));
      distribution.forEach((bonus, cell) => {
        expect(board.getBonus(cell)).toBe(bonus);
      });
    });
  });
});
