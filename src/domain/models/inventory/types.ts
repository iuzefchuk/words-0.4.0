import { Letter, Player } from '@/domain/enums.ts';

export type InventorySnapshot = {
  readonly discardPool: TilePoolSnapshot;
  readonly drawPool: TilePoolSnapshot;
  readonly playerPools: Map<Player, TilePoolSnapshot>;
};

export type InventoryView = {
  areTilesEqual(firstTile: Tile, secondTile: Tile): boolean;
  getTileLetter(tile: Tile): Letter;
  getTilesFor(player: Player): ReadonlyArray<Tile>;
  hasTilesFor(player: Player): boolean;
  readonly tilesPerPlayer: number;
  readonly unusedTilesCount: number;
};

export type Tile = Brand<string, 'Tile'>;

export type TileCollection = ReadonlyMap<Letter, ReadonlyArray<Tile>>;

export type TilePoolSnapshot = {
  readonly capacity: number | undefined;
  readonly tiles: Array<Tile>;
};
