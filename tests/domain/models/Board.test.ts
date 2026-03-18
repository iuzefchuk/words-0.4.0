import { describe, it, expect } from 'vitest';
import Board, { Axis } from '@/domain/models/Board.ts';
import { cellIndex, tileId } from '$/helpers.ts';

describe('Board', () => {
  it('creates a board with 225 cells', () => {
    const board = Board.create();
    expect(board.cells).toHaveLength(225);
  });

  it('cells are indexed 0 to 224', () => {
    const board = Board.create();
    expect(board.cells[0]).toBe(cellIndex(0));
    expect(board.cells[224]).toBe(cellIndex(224));
  });

  describe('placeTile / findTile round-trip', () => {
    it('places a tile and finds it by cell and by tile', () => {
      const board = Board.create();
      const cell = cellIndex(112);
      const tile = tileId('tile-a');

      board.placeTile(cell, tile);

      expect(board.findTileByCell(cell)).toBe(tile);
      expect(board.findCellByTile(tile)).toBe(cell);
      expect(board.isCellOccupied(cell)).toBe(true);
      expect(board.isTilePlaced(tile)).toBe(true);
    });

    it('throws when placing on an occupied cell', () => {
      const board = Board.create();
      const cell = cellIndex(0);
      board.placeTile(cell, tileId('tile-a'));
      expect(() => board.placeTile(cell, tileId('tile-b'))).toThrow('already occupied');
    });

    it('throws when placing an already-placed tile', () => {
      const board = Board.create();
      const tile = tileId('tile-a');
      board.placeTile(cellIndex(0), tile);
      expect(() => board.placeTile(cellIndex(1), tile)).toThrow('already placed');
    });
  });

  describe('undoPlaceTile', () => {
    it('removes a placed tile', () => {
      const board = Board.create();
      const cell = cellIndex(50);
      const tile = tileId('tile-a');
      board.placeTile(cell, tile);
      board.undoPlaceTile(tile);

      expect(board.findTileByCell(cell)).toBeUndefined();
      expect(board.findCellByTile(tile)).toBeUndefined();
      expect(board.isCellOccupied(cell)).toBe(false);
    });

    it('throws when undoing a tile not on the board', () => {
      const board = Board.create();
      expect(() => board.undoPlaceTile(tileId('nope'))).toThrow('not on the board');
    });
  });

  describe('getAdjacentCells', () => {
    it('returns 2 adjacents for a corner cell (0)', () => {
      const board = Board.create();
      const adjacents = board.getAdjacentCells(cellIndex(0));
      expect(adjacents).toHaveLength(2);
      expect(adjacents).toContain(cellIndex(1));
      expect(adjacents).toContain(cellIndex(15));
    });

    it('returns 4 adjacents for center cell (112)', () => {
      const board = Board.create();
      const adjacents = board.getAdjacentCells(cellIndex(112));
      expect(adjacents).toHaveLength(4);
    });

    it('returns 3 adjacents for an edge cell (1)', () => {
      const board = Board.create();
      const adjacents = board.getAdjacentCells(cellIndex(1));
      expect(adjacents).toHaveLength(3);
    });
  });

  describe('calculateAxis', () => {
    it('returns X for horizontal placements', () => {
      const board = Board.create();
      const cells = [cellIndex(30), cellIndex(31), cellIndex(32)];
      expect(board.calculateAxis(cells)).toBe(Axis.X);
    });

    it('returns Y for vertical placements', () => {
      const board = Board.create();
      const cells = [cellIndex(7), cellIndex(22), cellIndex(37)];
      expect(board.calculateAxis(cells)).toBe(Axis.Y);
    });

    it('returns default X for empty sequence', () => {
      const board = Board.create();
      expect(board.calculateAxis([])).toBe(Axis.X);
    });
  });

  describe('isCellCenter', () => {
    it('returns true for cell 112', () => {
      const board = Board.create();
      expect(board.isCellCenter(cellIndex(112))).toBe(true);
    });

    it('returns false for cell 0', () => {
      const board = Board.create();
      expect(board.isCellCenter(cellIndex(0))).toBe(false);
    });
  });

  describe('getBonusForCell', () => {
    it('returns null for center cell', () => {
      const board = Board.create();
      expect(board.getBonusForCell(cellIndex(112))).toBeNull();
    });

    it('returns a bonus for a known bonus cell', () => {
      const board = Board.create();
      // Cell 4 is TripleWord
      expect(board.getBonusForCell(cellIndex(4))).toBe('TripleWord');
    });
  });

  describe('getAnchorCells', () => {
    it('returns only center cell when no opponent turns', () => {
      const board = Board.create();
      const anchors = board.getAnchorCells(false);
      expect(anchors.size).toBe(1);
      expect(anchors.has(cellIndex(112))).toBe(true);
    });

    it('returns adjacent cells when tiles are placed', () => {
      const board = Board.create();
      board.placeTile(cellIndex(112), tileId('tile-a'));
      const anchors = board.getAnchorCells(true);
      // Cell 112 is occupied, so it's excluded from anchors
      expect(anchors.has(cellIndex(112))).toBe(false);
      expect(anchors.has(cellIndex(111))).toBe(true);
      expect(anchors.has(cellIndex(113))).toBe(true);
      expect(anchors.has(cellIndex(97))).toBe(true);
      expect(anchors.has(cellIndex(127))).toBe(true);
    });
  });
});
