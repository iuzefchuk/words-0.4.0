import { Letter, Player } from '@/domain/enums.ts';
import { IdGenerator } from '@/domain/ports.ts';
import shuffleWithFisherYates from '@/shared/shuffleWithFisherYates.ts';

export type TileId = Brand<string, 'TileId'>;

export type TileCollection = ReadonlyMap<Letter, ReadonlyArray<TileId>>;

export type TileSnapshot = { id: string; letter: Letter };

export type InventoryView = {
  readonly unusedTilesCount: number;
  getTilesFor(player: Player): ReadonlyArray<TileId>;
  hasTilesFor(player: Player): boolean;
  areTilesEqual(firstTile: TileId, secondTile: TileId): boolean;
  getTileLetter(tile: TileId): Letter;
};

export type InventorySnapshot = {
  tileById: Map<TileId, TileSnapshot>;
  drawPoolTileIds: ReadonlyArray<TileId>;
  playerPoolsTileIds: Map<Player, ReadonlyArray<TileId>>;
  discardPoolTileIds: ReadonlyArray<TileId>;
};

export default class Inventory {
  private static readonly PLAYER_POOL_CAPACITY = 7;

  private static readonly LETTER_CONFIG: Record<Letter, { distribution: number; points: number }> = {
    [Letter.A]: { distribution: 9, points: 1 },
    [Letter.B]: { distribution: 2, points: 4 },
    [Letter.C]: { distribution: 2, points: 4 },
    [Letter.D]: { distribution: 4, points: 2 },
    [Letter.E]: { distribution: 12, points: 1 },
    [Letter.F]: { distribution: 2, points: 4 },
    [Letter.G]: { distribution: 3, points: 3 },
    [Letter.H]: { distribution: 2, points: 4 },
    [Letter.I]: { distribution: 9, points: 1 },
    [Letter.J]: { distribution: 1, points: 10 },
    [Letter.K]: { distribution: 1, points: 5 },
    [Letter.L]: { distribution: 4, points: 1 },
    [Letter.M]: { distribution: 2, points: 3 },
    [Letter.N]: { distribution: 6, points: 1 },
    [Letter.O]: { distribution: 8, points: 1 },
    [Letter.P]: { distribution: 2, points: 4 },
    [Letter.Q]: { distribution: 1, points: 10 },
    [Letter.R]: { distribution: 6, points: 1 },
    [Letter.S]: { distribution: 4, points: 1 },
    [Letter.T]: { distribution: 6, points: 1 },
    [Letter.U]: { distribution: 4, points: 2 },
    [Letter.V]: { distribution: 2, points: 4 },
    [Letter.W]: { distribution: 2, points: 4 },
    [Letter.X]: { distribution: 1, points: 8 },
    [Letter.Y]: { distribution: 2, points: 4 },
    [Letter.Z]: { distribution: 1, points: 10 },
  };

  private constructor(
    private readonly tileById: Map<TileId, Tile>,
    private drawPool: TilePool,
    private playerPools: Map<Player, TilePool>,
    private discardPool: TilePool,
  ) {}

  static create(players: ReadonlyArray<Player>, idGenerator: IdGenerator): Inventory {
    const tiles = Object.values(Letter).flatMap(letter =>
      Array.from({ length: Inventory.LETTER_CONFIG[letter].distribution }, () => Tile.create({ letter, idGenerator })),
    );
    shuffleWithFisherYates(tiles);
    const tileById = new Map<TileId, Tile>(tiles.map(tile => [tile.id, tile]));
    const drawPool = TilePool.create({ tiles });
    const playerPools = new Map(
      players.map(player => [player, TilePool.create({ capacity: this.PLAYER_POOL_CAPACITY })]),
    );
    const discardPool = TilePool.create();
    const inventory = new Inventory(tileById, drawPool, playerPools, discardPool);
    inventory.initializePlayerPools();
    return inventory;
  }

  static restoreFromSnapshot(snapshot: InventorySnapshot): Inventory {
    const { drawPoolTileIds, playerPoolsTileIds, discardPoolTileIds } = snapshot;
    const tileById = new Map(snapshot.tileById as Map<TileId, Tile>);
    const drawPool = TilePool.create({ tiles: drawPoolTileIds.map(tileId => tileById.get(tileId)!) });
    const playerPools = new Map(
      Object.entries(playerPoolsTileIds).map(([player, ids]) => [
        player as Player,
        TilePool.create({ tiles: ids, capacity: Inventory.PLAYER_POOL_CAPACITY }),
      ]),
    );
    const discardPool = TilePool.create({ tiles: discardPoolTileIds.map(tileId => tileById.get(tileId)!) });
    return new Inventory(tileById, drawPool, playerPools, discardPool);
  }

  get snapshot(): InventorySnapshot {
    return {
      tileById: this.tileById,
      drawPoolTileIds: this.drawPool.tileIds,
      playerPoolsTileIds: new Map([...this.playerPools].map(([player, pool]) => [player, pool.tileIds])),
      discardPoolTileIds: this.discardPool.tileIds,
    };
  }

  get unusedTilesCount(): number {
    return this.drawPool.tileCount;
  }

  getTilesFor(player: Player): ReadonlyArray<TileId> {
    return this.getTilePoolFor(player).tileIds;
  }

  hasTilesFor(player: Player): boolean {
    return this.getTilePoolFor(player).tileCount > 0;
  }

  getTileCollectionFor(player: Player): TileCollection {
    return this.getTilePoolFor(player).tileCollection;
  }

  areTilesEqual(firstTile: TileId, secondTile: TileId): boolean {
    return this.getTileById(firstTile).equals(this.getTileById(secondTile));
  }

  getTilePoints(tileId: TileId): number {
    const letter = this.getTileLetter(tileId);
    return Inventory.LETTER_CONFIG[letter].points;
  }

  getTileLetter(tileId: TileId): Letter {
    return this.getTileById(tileId).letter;
  }

  replenishTilesFor(player: Player): void {
    const pool = this.getTilePoolFor(player);
    this.replenishPlayerPool(pool);
  }

  discardTile({ player, tile }: { player: Player; tile: TileId }): void {
    const removedTile = this.getTilePoolFor(player).discardTile(tile);
    this.discardPool.addTile(removedTile);
  }

  private initializePlayerPools(): void {
    this.playerPools.forEach(pool => this.replenishPlayerPool(pool));
  }

  private getTilePoolFor(player: Player): TilePool {
    const pool = this.playerPools.get(player);
    if (!pool) throw new Error('Player pool not found');
    return pool;
  }

  private replenishPlayerPool(pool: TilePool): void {
    const drawCount = Math.min(Inventory.PLAYER_POOL_CAPACITY - pool.tileCount, this.unusedTilesCount);
    for (let i = 0; i < drawCount; i++) {
      pool.addTile(this.drawPool.popTile());
    }
  }

  private getTileById(tileId: TileId): Tile {
    const tile = this.tileById.get(tileId);
    if (!tile) throw new Error(`Can't find tile ${tileId}`);
    return tile;
  }
}

class TilePool {
  private readonly _tileIds: Array<TileId>;

  private constructor(
    private readonly capacity: number | undefined,
    private readonly tiles: Array<Tile>,
  ) {
    this._tileIds = tiles.map(t => t.id);
  }

  static create({ capacity, tiles }: { capacity?: number; tiles?: Array<Tile> } = {}): TilePool {
    return new TilePool(capacity, tiles ?? []);
  }

  get tileCount(): number {
    return this.tiles.length;
  }

  get tileIds(): ReadonlyArray<TileId> {
    return this._tileIds;
  }

  get tileCollection(): TileCollection {
    const collection = new Map<Letter, Array<TileId>>();
    for (const tile of this.tiles) {
      let arr = collection.get(tile.letter);
      if (!arr) collection.set(tile.letter, (arr = []));
      arr.push(tile.id);
    }
    return collection;
  }

  addTile(tile: Tile): void {
    if (this._tileIds.includes(tile.id)) throw new Error(`Tile ${tile} is already present`);
    this.validateCapacity({ newTileCount: this.tiles.length + 1 });
    this.tiles.push(tile);
    this._tileIds.push(tile.id);
  }

  discardTile(tileId: TileId): Tile {
    const index = this._tileIds.indexOf(tileId);
    if (index === -1) throw new Error('Tile absent');
    this._tileIds.splice(index, 1);
    const [removedTile] = this.tiles.splice(index, 1);
    return removedTile;
  }

  popTile(): Tile {
    const tile = this.tiles.pop();
    if (!tile) throw new Error('No tiles left to draw');
    this._tileIds.pop();
    return tile;
  }

  private validateCapacity({ newTileCount }: { newTileCount: number }): void {
    if (this.capacity !== undefined && newTileCount > this.capacity) throw new Error('Rack limit exceeded');
  }
}

class Tile {
  private constructor(
    readonly id: TileId,
    readonly letter: Letter,
  ) {}

  static create({ letter, idGenerator }: { letter: Letter; idGenerator: IdGenerator }): Tile {
    const id = idGenerator.execute() as TileId;
    return new Tile(id, letter);
  }

  static restore(id: TileId, letter: Letter): Tile {
    return new Tile(id, letter);
  }

  equals(other: Tile): boolean {
    return this.id === other.id;
  }
}
