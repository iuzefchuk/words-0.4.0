import { describe, it, expect } from 'vitest';
import ScoreCalculator from '@/domain/services/ScoreCalculator.ts';
import { cellIndex, tileId } from '$/helpers.ts';

describe('ScoreCalculator', () => {
  it('calculates score for a single word with no multipliers', () => {
    const placementLinks = [
      [
        { cell: cellIndex(112), tile: tileId('t1') },
        { cell: cellIndex(113), tile: tileId('t2') },
        { cell: cellIndex(114), tile: tileId('t3') },
      ],
    ];
    const newCells = new Set([cellIndex(112), cellIndex(113), cellIndex(114)]);
    const score = ScoreCalculator.execute(
      placementLinks,
      newCells,
      () => 1, // 1 point per tile
      () => 1, // no letter multiplier
      () => 1, // no word multiplier
    );
    expect(score).toBe(3);
  });

  it('applies letter multiplier to new tiles', () => {
    const placementLinks = [
      [
        { cell: cellIndex(0), tile: tileId('t1') },
        { cell: cellIndex(1), tile: tileId('t2') },
      ],
    ];
    const newCells = new Set([cellIndex(0), cellIndex(1)]);
    const score = ScoreCalculator.execute(
      placementLinks,
      newCells,
      () => 2,
      cell => (cell === cellIndex(0) ? 3 : 1), // triple letter on cell 0
      () => 1,
    );
    // tile 0: 2 * 3 = 6, tile 1: 2 * 1 = 2 => total = 8
    expect(score).toBe(8);
  });

  it('applies word multiplier', () => {
    const placementLinks = [
      [
        { cell: cellIndex(0), tile: tileId('t1') },
        { cell: cellIndex(1), tile: tileId('t2') },
      ],
    ];
    const newCells = new Set([cellIndex(0), cellIndex(1)]);
    const score = ScoreCalculator.execute(
      placementLinks,
      newCells,
      () => 1,
      () => 1,
      cell => (cell === cellIndex(0) ? 2 : 1), // double word on cell 0
    );
    // (1 + 1) * 2 = 4
    expect(score).toBe(4);
  });

  it('does not apply multipliers to existing tiles', () => {
    const placementLinks = [
      [
        { cell: cellIndex(0), tile: tileId('t1') }, // existing
        { cell: cellIndex(1), tile: tileId('t2') }, // new
      ],
    ];
    const newCells = new Set([cellIndex(1)]); // only cell 1 is new
    const score = ScoreCalculator.execute(
      placementLinks,
      newCells,
      () => 5,
      () => 3, // should only apply to new
      () => 1,
    );
    // existing: 5 * 1 = 5, new: 5 * 3 = 15 => total = 20
    expect(score).toBe(20);
  });

  it('sums scores for multiple words (cross-word)', () => {
    const placementLinks = [
      [
        { cell: cellIndex(0), tile: tileId('t1') },
        { cell: cellIndex(1), tile: tileId('t2') },
      ],
      [
        { cell: cellIndex(0), tile: tileId('t1') },
        { cell: cellIndex(15), tile: tileId('t3') },
      ],
    ];
    const newCells = new Set([cellIndex(0), cellIndex(1), cellIndex(15)]);
    const score = ScoreCalculator.execute(
      placementLinks,
      newCells,
      () => 1,
      () => 1,
      () => 1,
    );
    // word 1: 2, word 2: 2 => total = 4
    expect(score).toBe(4);
  });
});
