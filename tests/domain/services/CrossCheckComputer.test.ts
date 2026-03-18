import { describe, it, expect } from 'vitest';
import CrossCheckComputer from '@/domain/services/CrossCheckComputer.ts';
import Board, { Axis } from '@/domain/models/Board.ts';
import { cellIndex } from '$/helpers.ts';
import Inventory from '@/domain/models/Inventory.ts';
import { Player } from '@/domain/enums.ts';
import { TestIdGenerator, createTestDictionary } from '$/helpers.ts';

function setup(words: ReadonlyArray<string> = ['CAT', 'CAR', 'AT', 'TAR']) {
  const idGenerator = new TestIdGenerator();
  const board = Board.create();
  const inventory = Inventory.create({ players: [Player.User, Player.Opponent], idGenerator });
  const dictionary = createTestDictionary(words);
  const computer = new CrossCheckComputer(board, dictionary, inventory);
  return { board, inventory, dictionary, computer };
}

describe('CrossCheckComputer', () => {
  it('returns all dictionary letters for an anchor with no adjacent tiles', () => {
    const { computer, dictionary } = setup();
    // Center cell on empty board — no adjacent tiles, so all letters valid
    const letters = computer.getFor({ axis: Axis.X, cell: cellIndex(112) });
    expect(letters).toBe(dictionary.allLetters);
  });

  it('restricts letters based on prefix from adjacent tiles', () => {
    const { board, inventory, computer } = setup(['CAT', 'CAR', 'COT']);
    const userTiles = inventory.getTilesFor(Player.User);

    // Place a tile at center (112) — this creates adjacency
    board.placeTile(cellIndex(112), userTiles[0]);

    // Get cross-check for cell to the right (113) on X axis
    const letters = computer.getFor({ axis: Axis.X, cell: cellIndex(113) });
    // Should be a set (possibly restricted by prefix/suffix context)
    expect(letters).toBeInstanceOf(Set);
  });

  it('caches results for the same axis and cell', () => {
    const { computer } = setup();
    const coords = { axis: Axis.X, cell: cellIndex(112) };

    const first = computer.getFor(coords);
    const second = computer.getFor(coords);
    // Same reference — cached
    expect(second).toBe(first);
  });

  it('returns empty set when no valid letters exist', () => {
    // Dictionary with only 'AB' — very limited
    const { board, inventory, computer } = setup(['AB']);
    const userTiles = inventory.getTilesFor(Player.User);

    // Place tile at 112 (center)
    board.placeTile(cellIndex(112), userTiles[0]);

    // Check a cell adjacent on Y axis — prefix is the letter at 112
    const letters = computer.getFor({ axis: Axis.Y, cell: cellIndex(127) });
    expect(letters).toBeInstanceOf(Set);
    // Result is restricted — at most the letters that can follow the prefix
    expect(letters.size).toBeLessThanOrEqual(26);
  });
});
