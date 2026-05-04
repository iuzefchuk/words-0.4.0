import { Bonus, Type } from '@/domain/models/board/enums.ts';
import LayoutService from '@/domain/models/board/services/layout/LayoutService.ts';
import { BonusDistribution, Cell } from '@/domain/models/board/types.ts';
import shuffleWithFisherYates from '@/shared/shuffleWithFisherYates.ts';

type OctantLocation = readonly [row: number, col: number];

// Octant is an upper-left slice of the board depicted on illustration below. The 8 D4 symmetries (4 rotations + 4 reflections) expand it to the full layout:

// [0,0] .     .     .     .     .     .     .     .     .     .     .     .     .     .
// [1,0] [1,1] .     .     .     .     .     .     .     .     .     .     .     .     .
// [2,0] [2,1] [2,2] .     .     .     .     .     .     .     .     .     .     .     .
// [3,0] [3,1] [3,2] [3,3] .     .     .     .     .     .     .     .     .     .     .
// [4,0] [4,1] [4,2] [4,3] [4,4] .     .     .     .     .     .     .     .     .     .
// [5,0] [5,1] [5,2] [5,3] [5,4] [5,5] .     .     .     .     .     .     .     .     .
// [6,0] [6,1] [6,2] [6,3] [6,4] [6,5] [6,6] .     .     .     .     .     .     .     .
// [7,0] [7,1] [7,2] [7,3] [7,4] [7,5] [7,6] *     .     .     .     .     .     .     .   (* = center)
// .     .     .     .     .     .     .     .     .     .     .     .     .     .     .
// .     .     .     .     .     .     .     .     .     .     .     .     .     .     .
// .     .     .     .     .     .     .     .     .     .     .     .     .     .     .
// .     .     .     .     .     .     .     .     .     .     .     .     .     .     .
// .     .     .     .     .     .     .     .     .     .     .     .     .     .     .
// .     .     .     .     .     .     .     .     .     .     .     .     .     .     .
// .     .     .     .     .     .     .     .     .     .     .     .     .     .     .

export default class BonusService {
  private static readonly NON_CENTER_CELLS: ReadonlyArray<Cell> = LayoutService.CELLS.filter(
    cell => cell !== LayoutService.CENTER_CELL,
  );

  private static readonly PRESET_OCTANT_LOCATIONS_BY_BONUS: ReadonlyMap<Bonus, ReadonlyArray<OctantLocation>> = new Map([
    [
      Bonus.DoubleLetter,
      [
        [3, 0],
        [6, 2],
        [6, 6],
        [7, 3],
      ],
    ],
    [
      Bonus.DoubleWord,
      [
        [1, 1],
        [2, 2],
        [3, 3],
        [4, 4],
      ],
    ],
    [
      Bonus.TripleLetter,
      [
        [5, 1],
        [5, 5],
      ],
    ],
    [
      Bonus.TripleWord,
      [
        [0, 0],
        [7, 0],
      ],
    ],
  ]);

  private static readonly PRESET_DISTRIBUTION: BonusDistribution = (() => {
    const result = new Map<Cell, Bonus>();
    for (const [bonus, locations] of this.PRESET_OCTANT_LOCATIONS_BY_BONUS) {
      for (const location of locations) {
        for (const cell of this.getSymmetricCells(location)) result.set(cell, bonus);
      }
    }
    return result;
  })();

  static createDistribution(type: Type, randomizer?: () => number): BonusDistribution {
    switch (type) {
      case Type.Preset:
        return this.PRESET_DISTRIBUTION;
      case Type.Random:
        return this.createRandomDistribution(randomizer);
      default:
        throw new ReferenceError(`unexpected board type: ${String(type)}`);
    }
  }

  private static createRandomDistribution(randomizer: () => number = Math.random): BonusDistribution {
    const cells = [...this.NON_CENTER_CELLS];
    shuffleWithFisherYates({ array: cells, randomizer });
    const bonuses = [...this.PRESET_DISTRIBUTION.values()];
    const result = new Map<Cell, Bonus>();
    for (let idx = 0; idx < bonuses.length; idx++) {
      const cell = cells[idx];
      const bonus = bonuses[idx];
      if (cell === undefined || bonus === undefined) break;
      result.set(cell, bonus);
    }
    return result;
  }

  private static getSymmetricCells([row, col]: OctantLocation): ReadonlySet<Cell> {
    const size = LayoutService.CELLS_PER_AXIS;
    const last = size - 1;
    const reflections: ReadonlyArray<OctantLocation> = [
      [row, col],
      [row, last - col],
      [last - row, col],
      [last - row, last - col],
      [col, row],
      [col, last - row],
      [last - col, row],
      [last - col, last - row],
    ];
    const cells = new Set<Cell>();
    for (const [rowIdx, colIdx] of reflections) cells.add((rowIdx * size + colIdx) as Cell);
    return cells;
  }
}
