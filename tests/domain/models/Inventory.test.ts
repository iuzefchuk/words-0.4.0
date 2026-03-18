import { describe, it, expect } from 'vitest';
import Inventory from '@/domain/models/Inventory.ts';
import { Player } from '@/domain/enums.ts';
import { TestIdGenerator } from '$/helpers.ts';

describe('Inventory', () => {
  function createInventory() {
    return Inventory.create({
      players: [Player.User, Player.Opponent],
      idGenerator: new TestIdGenerator(),
    });
  }

  it('creates with correct total tile count (98)', () => {
    const inventory = createInventory();
    // 98 total tiles - 14 dealt (7 per player) = 84 remaining
    expect(inventory.unusedTilesCount).toBe(84);
  });

  it('gives each player 7 tiles initially', () => {
    const inventory = createInventory();
    expect(inventory.getTilesFor(Player.User)).toHaveLength(7);
    expect(inventory.getTilesFor(Player.Opponent)).toHaveLength(7);
  });

  it('hasTilesFor returns true when player has tiles', () => {
    const inventory = createInventory();
    expect(inventory.hasTilesFor(Player.User)).toBe(true);
    expect(inventory.hasTilesFor(Player.Opponent)).toBe(true);
  });

  it('getTileLetter returns a valid letter', () => {
    const inventory = createInventory();
    const tiles = inventory.getTilesFor(Player.User);
    const letter = inventory.getTileLetter(tiles[0]);
    expect(letter).toMatch(/^[A-Z]$/);
  });

  it('getTilePoints returns a positive number', () => {
    const inventory = createInventory();
    const tiles = inventory.getTilesFor(Player.User);
    const points = inventory.getTilePoints(tiles[0]);
    expect(points).toBeGreaterThan(0);
  });

  it('areTilesEqual returns true for same tile', () => {
    const inventory = createInventory();
    const tiles = inventory.getTilesFor(Player.User);
    expect(inventory.areTilesEqual(tiles[0], tiles[0])).toBe(true);
  });

  it('areTilesEqual returns false for different tiles', () => {
    const inventory = createInventory();
    const tiles = inventory.getTilesFor(Player.User);
    expect(inventory.areTilesEqual(tiles[0], tiles[1])).toBe(false);
  });

  describe('discardTile and replenishTilesFor', () => {
    it('discards a tile and replenishes to 7', () => {
      const inventory = createInventory();
      const tiles = inventory.getTilesFor(Player.User);
      const tileToDiscard = tiles[0];

      inventory.discardTile({ player: Player.User, tile: tileToDiscard });
      expect(inventory.getTilesFor(Player.User)).toHaveLength(6);

      inventory.replenishTilesFor(Player.User);
      expect(inventory.getTilesFor(Player.User)).toHaveLength(7);
      expect(inventory.unusedTilesCount).toBe(83);
    });
  });

  describe('shuffleTilesFor', () => {
    it('does not change tile count', () => {
      const inventory = createInventory();
      inventory.shuffleTilesFor(Player.User);
      expect(inventory.getTilesFor(Player.User)).toHaveLength(7);
    });
  });
});
