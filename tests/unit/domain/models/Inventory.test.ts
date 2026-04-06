import { Letter, Player } from '@/domain/enums.ts';
import Inventory from '@/domain/models/Inventory.ts';
import areEqual from '$/areEqual.ts';
import { castTileId } from '$/casts.ts';

describe('Inventory', () => {
  describe('initial state', () => {
    let inventory: Inventory;

    it('should have correct number of player tiles', () => {
      expect(inventory.getTilesFor(Player.User)).toHaveLength(7);
      expect(inventory.getTilesFor(Player.Opponent)).toHaveLength(7);
    });

    it('should have correct unused tiles count', () => {
      expect(inventory.unusedTilesCount).toBe(98 - 7 * 2);
    });

    it('should have the correct distribution for known letters', () => {
      // A has 9 tiles: A-0 through A-8
      expect(inventory.getTileLetter(castTileId('A-8'))).toBe(Letter.A);
      // Z has 1 tile: Z-0
      expect(inventory.getTileLetter(castTileId('Z-0'))).toBe(Letter.Z);
      // J has 1 tile: J-0
      expect(inventory.getTileLetter(castTileId('J-0'))).toBe(Letter.J);
      // E has 12: E-0 through E-11
      expect(inventory.getTileLetter(castTileId('E-11'))).toBe(Letter.E);
    });

    beforeEach(() => {
      inventory = Inventory.create([Player.User, Player.Opponent]);
    });
  });

  describe('tile', () => {
    let inventory: Inventory;

    it('should return letter correctly', () => {
      expect(inventory.getTileLetter(castTileId('A-0'))).toBe(Letter.A);
      expect(inventory.getTileLetter(castTileId('K-0'))).toBe(Letter.K);
      expect(inventory.getTileLetter(castTileId('Z-0'))).toBe(Letter.Z);
      expect(() => inventory.getTileLetter(castTileId('INVALID'))).toThrow();
    });

    it('should return points correctly', () => {
      expect(inventory.getTilePoints(castTileId('A-0'))).toBe(1);
      expect(inventory.getTilePoints(castTileId('K-0'))).toBe(5);
      expect(inventory.getTilePoints(castTileId('Z-0'))).toBe(10);
      expect(() => inventory.getTilePoints(castTileId('INVALID'))).toThrow();
    });

    it('should measure equality correctly', () => {
      const firstTileId = castTileId('A-0');
      const secondTileId = castTileId('A-1');
      expect(inventory.areTilesEqual(firstTileId, firstTileId)).toBe(true);
      expect(inventory.areTilesEqual(firstTileId, secondTileId)).toBe(false);
    });

    beforeEach(() => {
      inventory = Inventory.create([Player.User, Player.Opponent]);
    });
  });

  describe('how player views tiles', () => {
    let inventory: Inventory;

    it('should return correct count if not empty', () => {
      expect(inventory.hasTilesFor(Player.User)).toBe(true);
    });

    it('should return correct count if empty', () => {
      const tiles = inventory.getTilesFor(Player.User);
      for (const tile of tiles) inventory.discardTile({ player: Player.User, tile });
      expect(inventory.hasTilesFor(Player.User)).toBe(false);
    });

    it('should return collection correctly', () => {
      // TODO compare with getTilesFor
      const collection = inventory.getTileCollectionFor(Player.User);
      expect(collection).toBeInstanceOf(Map);
      let totalTiles = 0;
      for (const tiles of collection.values()) totalTiles += tiles.length;
      expect(totalTiles).toBe(7);
    });

    beforeEach(() => {
      inventory = Inventory.create([Player.User, Player.Opponent]);
    });
  });

  describe('how player manages tiles', () => {
    let inventory: Inventory;

    it('should discard correctly', () => {
      const tiles = inventory.getTilesFor(Player.User);
      inventory.discardTile({ player: Player.User, tile: tiles[0]! });
      expect(inventory.getTilesFor(Player.User)).toHaveLength(6);
    });

    it('should not discard from different player', () => {
      const tiles = inventory.getTilesFor(Player.User);
      expect(() => inventory.discardTile({ player: Player.Opponent, tile: tiles[0]! })).toThrow();
    });

    it('should replenish correctly', () => {
      const { unusedTilesCount } = inventory;
      const tiles = inventory.getTilesFor(Player.User);
      inventory.discardTile({ player: Player.User, tile: tiles[0]! });
      inventory.discardTile({ player: Player.User, tile: tiles[1]! });
      inventory.discardTile({ player: Player.User, tile: tiles[2]! });
      expect(inventory.getTilesFor(Player.User)).toHaveLength(4);
      expect(inventory.unusedTilesCount).toBe(unusedTilesCount);
      inventory.replenishTilesFor(Player.User);
      expect(inventory.getTilesFor(Player.User)).toHaveLength(7);
      expect(inventory.unusedTilesCount).toBe(unusedTilesCount - 3);
    });

    it('should not replenish if pool is at capacity', () => {
      const { unusedTilesCount } = inventory;
      inventory.replenishTilesFor(Player.User);
      expect(inventory.unusedTilesCount).toBe(unusedTilesCount);
    });

    beforeEach(() => {
      inventory = Inventory.create([Player.User, Player.Opponent]);
    });
  });

  describe('snapshot', () => {
    let inventory: Inventory;

    it('should capture and restore drawPool', () => {
      const { drawPool } = inventory.snapshot;
      const restoredInventory = Inventory.restoreFromSnapshot(inventory.snapshot);
      expect(areEqual(restoredInventory.snapshot.drawPool, drawPool)).toBe(true);
    });

    it('should capture and restore playerPools', () => {
      const { playerPools } = inventory.snapshot;
      const restoredInventory = Inventory.restoreFromSnapshot(inventory.snapshot);
      expect(areEqual(restoredInventory.snapshot.playerPools, playerPools)).toBe(true);
    });

    it('should capture and restore discardPool', () => {
      const { discardPool } = inventory.snapshot;
      const restoredInventory = Inventory.restoreFromSnapshot(inventory.snapshot);
      expect(areEqual(restoredInventory.snapshot.discardPool, discardPool)).toBe(true);
    });

    beforeEach(() => {
      inventory = Inventory.create([Player.User, Player.Opponent]);
    });
  });
});
