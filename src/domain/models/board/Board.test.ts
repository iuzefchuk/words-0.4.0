import Board from '@/domain/models/board/Board.ts';
import { BoardType } from '@/domain/models/board/enums.ts';
import BonusService from '@/domain/models/board/services/bonus/BonusService.ts';
import { Cell } from '@/domain/models/board/types.ts';
import CryptoSeedingService from '@/infrastructure/services/CryptoSeedingService.ts';

describe('Board', () => {
  describe('initial state', () => {
    it('has correct number of cells per axis', () => {
      expect(Board.CELLS_PER_AXIS).toBe(Math.sqrt(Board.TOTAL_CELLS));
    });

    it('calculate cells by index correctly', () => {
      expect(Board.CELLS_BY_INDEX).toHaveLength(Board.TOTAL_CELLS);
    });

    it('calculates center cell correctly', () => {
      const mid = Math.floor(Board.CELLS_PER_AXIS / 2);
      const centerValue = (mid * Board.CELLS_PER_AXIS + mid) as Cell;
      expect(Board.CENTER_CELL).toBe(centerValue);
    });
  });

  describe('bonus system', () => {
    it('returns multipliers correctly', () => {
      const seedingService = new CryptoSeedingService();
      Object.values(BoardType).forEach(type => {
        const seed = seedingService.createSeed();
        const board = Board.create(type, seedingService.createRandomizer(seed));
        const distribution = BonusService.createBonusDistribution(type, seedingService.createRandomizer(seed));
        distribution.forEach((bonus, cell) => {
          expect(board.getMultiplierForLetter(cell)).not.toBeNull();
          expect(board.getMultiplierForWord(cell)).not.toBeNull();
        });
      });
    });

    it('changes bonus distribution with type', () => {
      // TODO changeType
    });
  });

  describe('axis', () => {
    // let board: Board;

    // beforeEach(() => {
    //   board = Board.create(BoardType.Classic);
    // });

    it('calculates correctly', () => {
      // TODO calculateAxis
    });
  });

  describe('anchor cells', () => {
    // let board: Board;

    // beforeEach(() => {
    //   board = Board.create(BoardType.Classic);
    // });

    it('calculate correctly', () => {
      // TODO calculateAnchorCells
    });
  });

  describe('tiles placement', () => {
    // let board: Board;

    // beforeEach(() => {
    //   board = Board.create(BoardType.Classic);
    // });

    it('places tile correctly', () => {
      // TODO placeTile
    });

    it('undoes place tile correctly', () => {
      // TODO undoPlaceTile
    });

    it('finds cell correctly', () => {
      // TODO findCellByTile
      // TODO isCellOccupied
    });

    it('finds tile correctly', () => {
      // TODO findTileByCell
      // TODO isTilePlaced
    });

    it('resolves placement correctly', () => {
      // TODO resolvePlacement
    });
  });

  // describe('clone', () => {
  //   let board: Board;

  //   beforeEach(() => {
  //     board = Board.create(BoardType.Classic);
  //   });

  //   it('captures and restores', () => {
  //     const { clone: originalclone } = board;
  //     const restoredBoard = Board.createFromclone(originalclone);
  //     expect(restoredBoard.clone).toEqual(originalclone);
  //   });
  // });
});

// describe('PlacementBuilder', () => {
//   let board: Board;

//   beforeEach(() => {
//     board = Board.create(BoardType.Classic);
//   });

//   describe('error cases', () => {
//     it('should throw when the tiles array is empty', () => {
//       const coords = { axis: Axis.X, cell: castCellIndex(112) };
//       expect(() => PlacementBuilder.execute(board, { coords, tiles: [] })).toThrow('Tile sequence can`t be empty');
//     });
//   });

//   describe('basic placements', () => {
//     it('should return links for both tiles when a single tile has an adjacent tile on the same axis', () => {
//       board.placeTile(castCellIndex(112), castTileId('A-0'));
//       board.placeTile(castCellIndex(113), castTileId('B-0'));
//       const coords = { axis: Axis.X, cell: castCellIndex(112) };
//       const result = PlacementBuilder.execute(board, { coords, tiles: [castTileId('A-0')] });
//       expect(result).toHaveLength(2);
//       expect(result[0]).toEqual({ cell: castCellIndex(112), tile: castTileId('A-0') });
//       expect(result[1]).toEqual({ cell: castCellIndex(113), tile: castTileId('B-0') });
//     });

//     it('should return links for both tiles when two are adjacent on the same axis', () => {
//       board.placeTile(castCellIndex(112), castTileId('A-0'));
//       board.placeTile(castCellIndex(113), castTileId('B-0'));
//       const coords = { axis: Axis.X, cell: castCellIndex(112) };
//       const result = PlacementBuilder.execute(board, { coords, tiles: [castTileId('A-0'), castTileId('B-0')] });
//       expect(result).toHaveLength(2);
//     });

//     it('should return all three links for three contiguous tiles', () => {
//       board.placeTile(castCellIndex(112), castTileId('A-0'));
//       board.placeTile(castCellIndex(113), castTileId('B-0'));
//       board.placeTile(castCellIndex(114), castTileId('C-0'));
//       const coords = { axis: Axis.X, cell: castCellIndex(112) };
//       const result = PlacementBuilder.execute(board, { coords, tiles: [castTileId('A-0'), castTileId('B-0'), castTileId('C-0')] });
//       expect(result).toHaveLength(3);
//     });

//     it('should return a segment for the matching tile only when tiles have a gap between them', () => {
//       board.placeTile(castCellIndex(112), castTileId('A-0'));
//       // gap at 113
//       board.placeTile(castCellIndex(114), castTileId('B-0'));
//       const coords = { axis: Axis.X, cell: castCellIndex(112) };
//       const result = PlacementBuilder.execute(board, { coords, tiles: [castTileId('A-0')] });
//       // A-0 is a single tile segment; segmentContainsTile is true, matchedTilesCount matches
//       // but links = [A-0], which is length 1 (valid per builder, usability checked elsewhere)
//       expect(result).toHaveLength(1);
//       expect(result[0]).toEqual({ cell: castCellIndex(112), tile: castTileId('A-0') });
//     });
//   });

//   describe('segment detection', () => {
//     it('should return the full contiguous segment when a tile is placed between two existing tiles', () => {
//       board.placeTile(castCellIndex(111), castTileId('A-0'));
//       board.placeTile(castCellIndex(112), castTileId('B-0'));
//       board.placeTile(castCellIndex(113), castTileId('C-0'));
//       const coords = { axis: Axis.X, cell: castCellIndex(112) };
//       const result = PlacementBuilder.execute(board, { coords, tiles: [castTileId('B-0')] });
//       expect(result).toHaveLength(3);
//     });

//     it('should return the full segment for tiles at the start of an axis row with following existing tiles', () => {
//       // Row 7 starts at cell 105
//       board.placeTile(castCellIndex(105), castTileId('A-0'));
//       board.placeTile(castCellIndex(106), castTileId('B-0'));
//       board.placeTile(castCellIndex(107), castTileId('C-0'));
//       const coords = { axis: Axis.X, cell: castCellIndex(105) };
//       const result = PlacementBuilder.execute(board, { coords, tiles: [castTileId('A-0')] });
//       expect(result).toHaveLength(3);
//     });

//     it('should return the full segment for tiles at the end of an axis with preceding existing tiles', () => {
//       // Row 7 ends at cell 119
//       board.placeTile(castCellIndex(117), castTileId('A-0'));
//       board.placeTile(castCellIndex(118), castTileId('B-0'));
//       board.placeTile(castCellIndex(119), castTileId('C-0'));
//       const coords = { axis: Axis.X, cell: castCellIndex(119) };
//       const result = PlacementBuilder.execute(board, { coords, tiles: [castTileId('C-0')] });
//       expect(result).toHaveLength(3);
//     });
//   });

//   describe('edge cases', () => {
//     it('should build correctly for a tile at position 0 (left edge of axis)', () => {
//       board.placeTile(castCellIndex(105), castTileId('A-0'));
//       board.placeTile(castCellIndex(106), castTileId('B-0'));
//       const coords = { axis: Axis.X, cell: castCellIndex(105) };
//       const result = PlacementBuilder.execute(board, { coords, tiles: [castTileId('A-0')] });
//       expect(result).toHaveLength(2);
//     });

//     it('should build correctly for a tile at position 14 (right edge of axis)', () => {
//       board.placeTile(castCellIndex(118), castTileId('A-0'));
//       board.placeTile(castCellIndex(119), castTileId('B-0'));
//       const coords = { axis: Axis.X, cell: castCellIndex(119) };
//       const result = PlacementBuilder.execute(board, { coords, tiles: [castTileId('B-0')] });
//       expect(result).toHaveLength(2);
//     });

//     it('should return an empty array when no tiles are found in axis cells', () => {
//       const coords = { axis: Axis.X, cell: castCellIndex(112) };
//       const result = PlacementBuilder.execute(board, { coords, tiles: [castTileId('A-0')] });
//       expect(result).toEqual([]);
//     });

//     it('should return an empty array when matchedTilesCount does not match tiles.length', () => {
//       board.placeTile(castCellIndex(112), castTileId('A-0'));
//       board.placeTile(castCellIndex(113), castTileId('B-0'));
//       const coords = { axis: Axis.X, cell: castCellIndex(112) };
//       // Request 3 tiles but only 2 placed
//       const result = PlacementBuilder.execute(board, { coords, tiles: [castTileId('A-0'), castTileId('B-0'), castTileId('C-0')] });
//       expect(result).toEqual([]);
//     });

//     it('should return an empty array when requested tiles are not on the board at the anchor position', () => {
//       board.placeTile(castCellIndex(0), castTileId('A-0'));
//       const coords = { axis: Axis.X, cell: castCellIndex(112) };
//       const result = PlacementBuilder.execute(board, { coords, tiles: [castTileId('A-0')] });
//       expect(result).toEqual([]);
//     });

//     it('should return an empty array when only some requested tiles are found', () => {
//       board.placeTile(castCellIndex(112), castTileId('A-0'));
//       board.placeTile(castCellIndex(113), castTileId('B-0'));
//       const coords = { axis: Axis.X, cell: castCellIndex(112) };
//       const result = PlacementBuilder.execute(board, { coords, tiles: [castTileId('A-0'), castTileId('C-0')] });
//       expect(result).toEqual([]);
//     });

//     it('should return the correct segment containing the target tiles when multiple segments exist on the axis', () => {
//       // Segment 1: cells 105-106
//       board.placeTile(castCellIndex(105), castTileId('A-0'));
//       board.placeTile(castCellIndex(106), castTileId('B-0'));
//       // Gap at 107
//       // Segment 2: cells 108-109
//       board.placeTile(castCellIndex(108), castTileId('C-0'));
//       board.placeTile(castCellIndex(109), castTileId('D-0'));
//       const coords = { axis: Axis.X, cell: castCellIndex(108) };
//       const result = PlacementBuilder.execute(board, { coords, tiles: [castTileId('C-0')] });
//       expect(result).toHaveLength(2);
//       expect(result[0]).toEqual({ cell: castCellIndex(108), tile: castTileId('C-0') });
//       expect(result[1]).toEqual({ cell: castCellIndex(109), tile: castTileId('D-0') });
//     });
//   });

//   describe('axis handling', () => {
//     it('should resolve an X-axis (row) placement correctly', () => {
//       board.placeTile(castCellIndex(112), castTileId('A-0'));
//       board.placeTile(castCellIndex(113), castTileId('B-0'));
//       const coords = { axis: Axis.X, cell: castCellIndex(112) };
//       const result = PlacementBuilder.execute(board, { coords, tiles: [castTileId('A-0')] });
//       expect(result).toHaveLength(2);
//     });

//     it('should resolve a Y-axis (column) placement correctly', () => {
//       board.placeTile(castCellIndex(112), castTileId('A-0'));
//       board.placeTile(castCellIndex(127), castTileId('B-0')); // same column, next row (112 + 15)
//       const coords = { axis: Axis.Y, cell: castCellIndex(112) };
//       const result = PlacementBuilder.execute(board, { coords, tiles: [castTileId('A-0')] });
//       expect(result).toHaveLength(2);
//     });
//   });
// });
