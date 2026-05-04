import { describe, expect, test } from 'vitest';
import { Bonus, Type } from '@/domain/models/board/enums.ts';
import BonusService from '@/domain/models/board/services/bonus/BonusService.ts';
import LayoutService from '@/domain/models/board/services/layout/LayoutService.ts';
import { Cell } from '@/domain/models/board/types.ts';

function buildSymmetryQuadruples(size: number): ReadonlyArray<readonly [number, number, number, number]> {
  const last = size - 1;
  const quadruples: Array<readonly [number, number, number, number]> = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      quadruples.push([row * size + col, row * size + (last - col), (last - row) * size + col, col * size + row]);
    }
  }
  return quadruples;
}

describe('BonusService', () => {
  describe('createDistribution', () => {
    describe.each(Object.values(Type))('for %s type', type => {
      const distribution = BonusService.createDistribution(type);
      const otherTypes = Object.values(Type).filter(someType => someType !== type);
      test('excludes CENTER_CELL', () => {
        expect(distribution.has(LayoutService.CENTER_CELL)).toBe(false);
      });
      test('returns expected count per bonus', () => {
        const counts = new Map<Bonus, number>();
        for (const bonus of distribution.values()) {
          counts.set(bonus, (counts.get(bonus) ?? 0) + 1);
        }
        expect(Object.fromEntries(counts)).toEqual({
          [Bonus.DoubleLetter]: 24,
          [Bonus.DoubleWord]: 16,
          [Bonus.TripleLetter]: 12,
          [Bonus.TripleWord]: 8,
        });
      });
      describe.each(otherTypes)('comparing w/ %s', otherType => {
        const otherDistribution = BonusService.createDistribution(otherType);
        test('returns different result', () => {
          expect(distribution).not.toEqual(otherDistribution);
        });
      });
    });
    describe('for Preset type', () => {
      const presetDistribution = BonusService.createDistribution(Type.Preset);
      test('always returns same result', () => {
        expect(presetDistribution).toEqual(BonusService.createDistribution(Type.Preset));
      });
      test('returns D4-symmetric result', () => {
        const symmetryQuadruples = buildSymmetryQuadruples(LayoutService.CELLS_PER_AXIS) as ReadonlyArray<
          readonly [Cell, Cell, Cell, Cell]
        >;
        const asymmetric = symmetryQuadruples.filter(([origin, horizontal, vertical, diagonal]) => {
          const originBonus = presetDistribution.get(origin);
          return (
            presetDistribution.get(horizontal) !== originBonus ||
            presetDistribution.get(vertical) !== originBonus ||
            presetDistribution.get(diagonal) !== originBonus
          );
        });
        expect(asymmetric).toEqual([]);
      });
    });
    describe('for Random type', () => {
      describe('w/ same randomizer', () => {
        test('always returns same result', () => {
          const randomizer = (): number => 0.5;
          const actual = BonusService.createDistribution(Type.Random, randomizer);
          const expected = BonusService.createDistribution(Type.Random, randomizer);
          expect(actual).toEqual(expected);
        });
      });
      describe('w/ different randomizers', () => {
        test('always returns different result', () => {
          const firstRandomizer = (): number => 0.25;
          const secondRandomizer = (): number => 0.5;
          const actual = BonusService.createDistribution(Type.Random, firstRandomizer);
          const unexpected = BonusService.createDistribution(Type.Random, secondRandomizer);
          expect(actual).not.toEqual(unexpected);
        });
      });
      describe('w/out randomizer', () => {
        test('always returns different result', () => {
          const actual = BonusService.createDistribution(Type.Random);
          const unexpected = BonusService.createDistribution(Type.Random);
          expect(actual).not.toEqual(unexpected);
        });
      });
    });
  });
});
