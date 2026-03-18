import { describe, it, expect } from 'vitest';
import PlacementLinksBuilder from '@/domain/services/PlacementBuilder.ts';
import Board, { Axis } from '@/domain/models/Board.ts';
import { cellIndex, tileId } from '$/helpers.ts';

describe('PlacementLinksBuilder', () => {
  it('throws on empty tile sequence', () => {
    const board = Board.create();
    expect(() =>
      PlacementLinksBuilder.execute(board, {
        coords: { axis: Axis.X, cell: cellIndex(112) },
        tileSequence: [],
      }),
    ).toThrow('empty');
  });

  it('returns empty when no tiles are placed on the axis', () => {
    const board = Board.create();
    // Place a tile on cell 112 (center)
    board.placeTile(cellIndex(112), tileId('t1'));
    // Ask for placement links along Y axis starting at cell 0 — tile is on row 7, not row 0
    const links = PlacementLinksBuilder.execute(board, {
      coords: { axis: Axis.Y, cell: cellIndex(0) },
      tileSequence: [tileId('t1')],
    });
    expect(links).toEqual([]);
  });

  it('builds links for a single tile at center', () => {
    const board = Board.create();
    board.placeTile(cellIndex(112), tileId('t1'));
    const links = PlacementLinksBuilder.execute(board, {
      coords: { axis: Axis.X, cell: cellIndex(112) },
      tileSequence: [tileId('t1')],
    });
    expect(links).toHaveLength(1);
    expect(links[0]).toEqual({ cell: cellIndex(112), tile: tileId('t1') });
  });

  it('builds links for consecutive tiles on X axis', () => {
    const board = Board.create();
    board.placeTile(cellIndex(112), tileId('t1'));
    board.placeTile(cellIndex(113), tileId('t2'));
    board.placeTile(cellIndex(114), tileId('t3'));
    const links = PlacementLinksBuilder.execute(board, {
      coords: { axis: Axis.X, cell: cellIndex(112) },
      tileSequence: [tileId('t1'), tileId('t2'), tileId('t3')],
    });
    expect(links).toHaveLength(3);
    expect(links[0].cell).toBe(cellIndex(112));
    expect(links[1].cell).toBe(cellIndex(113));
    expect(links[2].cell).toBe(cellIndex(114));
  });

  it('includes existing tiles in the segment', () => {
    const board = Board.create();
    // Existing tile at 112
    board.placeTile(cellIndex(112), tileId('existing'));
    // New tiles at 113, 114
    board.placeTile(cellIndex(113), tileId('new1'));
    board.placeTile(cellIndex(114), tileId('new2'));
    const links = PlacementLinksBuilder.execute(board, {
      coords: { axis: Axis.X, cell: cellIndex(112) },
      tileSequence: [tileId('new1'), tileId('new2')],
    });
    // Should include all 3 tiles as a connected segment
    expect(links).toHaveLength(3);
  });

  it('returns empty for a gap between tiles', () => {
    const board = Board.create();
    board.placeTile(cellIndex(112), tileId('t1'));
    // Gap at 113
    board.placeTile(cellIndex(114), tileId('t2'));
    const links = PlacementLinksBuilder.execute(board, {
      coords: { axis: Axis.X, cell: cellIndex(112) },
      tileSequence: [tileId('t1'), tileId('t2')],
    });
    // Gap breaks the segment; t2 is not contiguous with t1
    expect(links).toEqual([]);
  });

  it('builds links along Y axis', () => {
    const board = Board.create();
    // Column 7: cells 7, 22, 37
    board.placeTile(cellIndex(7), tileId('t1'));
    board.placeTile(cellIndex(22), tileId('t2'));
    const links = PlacementLinksBuilder.execute(board, {
      coords: { axis: Axis.Y, cell: cellIndex(7) },
      tileSequence: [tileId('t1'), tileId('t2')],
    });
    expect(links).toHaveLength(2);
    expect(links[0].cell).toBe(cellIndex(7));
    expect(links[1].cell).toBe(cellIndex(22));
  });
});
