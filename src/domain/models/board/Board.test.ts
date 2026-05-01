import { describe, expect, test } from 'vitest';
import Board from '@/domain/models/board/Board.ts';
import fixtures from '@/domain/models/board/fixtures.ts';

describe('Board', () => {
  describe.each(fixtures)('for $desc', ({ instance, meta: { placements, unusedCells, unusedTiles } }) => {
    describe('anchorCells', () => {
      test('returns unique values', () => {
        const result = [...instance.anchorCells];
        const duplicates = result.filter((cell, idx) => result.indexOf(cell) !== idx);
        expect(duplicates).toEqual([]);
      });
      test('returns unoccupied cells', () => {
        const occupied = [...instance.anchorCells].filter(cell => instance.isCellOccupied(cell));
        expect(occupied).toEqual([]);
      });
      test.skipIf(placements.length === 0)('returns cells w/ adjacent tiles for non-empty board', () => {
        const withoutAdjacentTiles = [...instance.anchorCells].filter(
          cell => !instance.getAdjacentCells(cell).some(adj => instance.isCellOccupied(adj)),
        );
        expect(withoutAdjacentTiles).toEqual([]);
      });
    });
    describe('cells', () => {
      // covered in LayoutService.test.ts
    });
    describe('cellsPerAxis', () => {
      // covered in LayoutService.test.ts
    });
    describe('clone', () => {
      test('returns instance w/ same state', () => {
        expect(Board.clone(instance)).toEqual(instance);
      });
    });
    describe('buildPlacement', () => {
      // --
    });
    describe('findCellByTile', () => {
      describe.each(placements)('for placed tile $tile', ({ cell, tile }) => {
        test('finds a cell $cell', () => {
          expect(instance.findCellByTile(tile)).toBe(cell);
        });
      });
      describe.each(unusedTiles)('for unplaced tile %s', tile => {
        test('does not find a cell', () => {
          expect(instance.findCellByTile(tile)).toBeUndefined();
        });
      });
    });
    describe('findTileByCell', () => {
      describe.each(placements)('for occupied cell $cell', ({ cell, tile }) => {
        test('finds a tile $tile', () => {
          expect(instance.findTileByCell(cell)).toBe(tile);
        });
      });
      describe.each(unusedCells)('for unoccupied cell %i', cell => {
        test('does not find a tile', () => {
          expect(instance.findTileByCell(cell)).toBeUndefined();
        });
      });
    });
    describe('getAdjacentCells', () => {
      // covered in LayoutService.test.ts
    });
    describe('getAxisCells', () => {
      // covered in LayoutService.test.ts
    });
    describe('getCellPositionInColumn', () => {
      // covered in LayoutService.test.ts
    });
    describe('getCellPositionInRow', () => {
      // covered in LayoutService.test.ts
    });
    describe('getOppositeAxis', () => {
      // covered in LayoutService.test.ts
    });
    describe('isCellCenter', () => {
      // not covered
    });
    describe('isCellOccupied', () => {
      describe.each(placements)('for occupied cell $cell', ({ cell }) => {
        test('returns true', () => {
          expect(instance.isCellOccupied(cell)).toBe(true);
        });
      });
      describe.each(unusedCells)('for unoccupied cell %i', cell => {
        test('returns false', () => {
          expect(instance.isCellOccupied(cell)).toBe(false);
        });
      });
    });
    describe('isCellPositionAtAxisEnd', () => {
      // not covered
    });
    describe('isCellPositionAtAxisStart', () => {
      // not covered
    });
    describe('isTilePlaced', () => {
      describe.each(placements)('for placed tile $tile', ({ tile }) => {
        test('returns true', () => {
          expect(instance.isTilePlaced(tile)).toBe(true);
        });
      });
      describe.each(unusedTiles)('for unplaced tile %s', tile => {
        test('returns false', () => {
          expect(instance.isTilePlaced(tile)).toBe(false);
        });
      });
    });
    describe('placeTile', () => {
      test('assigns unplaced tile to unoccupied cell', () => {
        // --
      });
      test('does not assign unplaced tile to occupied cell', () => {
        // --
      });
      test('does not assign placed tile to unoccupied cell', () => {
        // --
      });
      test('does not assign placed tile to occupied cell', () => {
        // --
      });
    });
    describe('resolvePlacement', () => {
      describe.each(placements)('for $cell and $tile', ({ cell, tile }) => {
        test('resolves placement', () => {
          expect(instance.resolvePlacement([tile])).toEqual([{ cell, tile }]);
        });
      });
    });
    describe('undoPlaceTile', () => {
      test('removes placed tile', () => {
        // --
      });
      test('does not remove unplaced tile', () => {
        // --
      });
      test('allows new placement after placed tile removal', () => {
        // --
      });
    });
  });
  describe('create', () => {
    // --
  });
  describe('calculateAxis', () => {
    test('returns default for single cell w/ no occupied adjacents', () => {
      // --
    });
    test('returns result from combo w/ first occupied adjacent for single cell w/ occupied adjacents', () => {
      // --
    });
    test('returns x for horizontal cell combo', () => {
      // --
    });
    test('returns y for vertical cell combo', () => {
      // --
    });
    test('returns default for diagonal cell combo', () => {
      // --
    });
    test('returns default for unconnected cell combo', () => {
      // --
    });
  });
  describe('getMultiplierForLetter', () => {
    // --
  });
  describe('getMultiplierForWord', () => {
    // --
  });
  describe('getBonus', () => {
    // --
  });
});
