import Board from '@/domain/models/board/Board.ts';
import { BoardType } from '@/domain/models/board/enums.ts';
import BonusService from '@/domain/models/board/services/bonus/BonusService.ts';
import { Cell } from '@/domain/models/board/types.ts';
import { Tile } from '@/domain/models/inventory/types.ts';
import CryptoSeedingService from '@/infrastructure/services/CryptoSeedingService.ts';

describe('Board', () => {
  it('has correct number of cells per axis', () => {
    expect(Board.CELLS_PER_AXIS).toBe(Math.sqrt(Board.TOTAL_CELLS));
  });

  it('calculates cells by index correctly', () => {
    expect(Board.CELLS_BY_INDEX).toHaveLength(Board.TOTAL_CELLS);
  });

  it('calculates center cell correctly', () => {
    const mid = Math.floor(Board.CELLS_PER_AXIS / 2);
    const centerValue = (mid * Board.CELLS_PER_AXIS + mid) as Cell;
    expect(Board.CENTER_CELL).toBe(centerValue);
  });

  describe('cloning', () => {
    const tileA = 'A-0' as Tile;
    const tileB = 'B-1' as Tile;
    const cellA = 0 as Cell;
    const cellB = 1 as Cell;

    let board: Board;
    let clone: Board;

    beforeEach(() => {
      board = Board.create(BoardType.Classic);
      board.placeTile(cellA, tileA);
      board.placeTile(cellB, tileB);
      clone = Board.clone(board);
    });

    it('preserves board type', () => {
      expect(clone.type).toBe(board.type);
    });

    describe('preserves bonus distribution', () => {
      it.each(Board.CELLS_BY_INDEX)('cell %i', cell => {
        expect(clone.getBonus(cell)).toBe(board.getBonus(cell));
      });
    });

    it('preserves placed tiles', () => {
      expect(clone.findTileByCell(cellA)).toBe(tileA);
      expect(clone.findTileByCell(cellB)).toBe(tileB);
      expect(clone.findCellByTile(tileA)).toBe(cellA);
      expect(clone.findCellByTile(tileB)).toBe(cellB);
    });

    it('is not affected by modifications to the source', () => {
      const tileD = 'D-2' as Tile;
      const cellD = 3 as Cell;
      board.placeTile(cellD, tileD);
      expect(board.findTileByCell(cellD)).toBe(tileD);
      expect(clone.findTileByCell(cellD)).toBeUndefined();
    });

    it('does not affect the source when modified', () => {
      const tileC = 'C-3' as Tile;
      const cellC = 2 as Cell;
      clone.placeTile(cellC, tileC);
      expect(clone.findTileByCell(cellC)).toBe(tileC);
      expect(board.findTileByCell(cellC)).toBeUndefined();
    });

    it('does not affect the source when tile is undone', () => {
      clone.undoPlaceTile(tileA);
      expect(clone.findTileByCell(cellA)).toBeUndefined();
      expect(board.findTileByCell(cellA)).toBe(tileA);
    });
  });

  it('creates itself correctly', () => {
    // TODO create
  });

  it('calculates anchor cells correctly', () => {
    // TODO calculateAnchorCells - test for game at different stages - empty board, board with some tiles placed, etc.
  });

  it('calculates axis correctly', () => {
    // TODO calculateAxis - for every cell combo possible
    // also, test negative cases - cells that are not in line, etc.
  });

  it('creates placement correctly', () => {
    // TODO createPlacement - for every coords and tiles possible
    // also, test negative cases - invalid coords, empty tiles, etc.
  });

  it('finds cell correctly', () => {
    // TODO findCellByTile, isCellOccupied - after 1) placeTile, 2) placeTile + undoPlaceTile
    // also, implement for every cell possible
    // also, test negative case - finding cell for tile that is not placed
  });

  it('finds tile correctly', () => {
    // TODO findTileByCell, isTilePlaced  - after 1) placeTile, 2) placeTile + undoPlaceTile
    // also, implement for every tile & cell possible
    // also, test negative case - finding tile for cell that is not occupied
  });

  it('calculates multipliers for letter correctly', () => {
    const seedingService = new CryptoSeedingService();
    Object.values(BoardType).forEach(type => {
      const seed = seedingService.createSeed();
      const board = Board.create(type, seedingService.createRandomizer(seed));
      const distribution = BonusService.createBonusDistribution(type, seedingService.createRandomizer(seed));
      distribution.forEach((bonus, cell) => expect(board.getMultiplierForLetter(cell)).not.toBeNull());
    });
  });

  it('calculates multipliers for word correctly', () => {
    const seedingService = new CryptoSeedingService();
    Object.values(BoardType).forEach(type => {
      const seed = seedingService.createSeed();
      const board = Board.create(type, seedingService.createRandomizer(seed));
      const distribution = BonusService.createBonusDistribution(type, seedingService.createRandomizer(seed));
      distribution.forEach((bonus, cell) => expect(board.getMultiplierForWord(cell)).not.toBeNull());
    });
  });

  it('places tile correctly', () => {
    // TODO placeTile - implement for every tile & cell possible
    // also, test negative cases - placing tile on occupied cell, placing tile that is already placed, etc.
  });

  it('resolves placement correctly', () => {
    // TODO resolvePlacement -implement for every tile combo possible
    // also, test negative case - resolving placement with tile that is not placed
  });

  it('undoes place tile correctly', () => {
    // TODO undoPlaceTile - implement for every case in 'places tile correctly'
    // also, test negative case - undoing tile that is not placed
  });
});
