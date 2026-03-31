import { Letter, Player } from '@/domain/enums.ts';
import shuffleWithFisherYates from '@/shared/shuffleWithFisherYates.ts';

export type InventorySnapshot = {
  readonly discardPool: TilePoolSnapshot;
  readonly drawPool: TilePoolSnapshot;
  readonly playerPools: Map<Player, TilePoolSnapshot>;
};

export type InventoryView = {
  areTilesEqual(firstTile: TileId, secondTile: TileId): boolean;
  getTileLetter(tile: TileId): Letter;
  getTilesFor(player: Player): ReadonlyArray<TileId>;
  hasTilesFor(player: Player): boolean;
  readonly unusedTilesCount: number;
};

export type TileCollection = ReadonlyMap<Letter, ReadonlyArray<TileId>>;

export type TileId = Brand<string, 'TileId'>;

type TilePoolSnapshot = {
  readonly capacity?: number;
  readonly tiles: Array<Tile>;
};

class Tile {
  private constructor(
    readonly id: TileId,
    readonly letter: Letter,
  ) {}

  static create(id: TileId, letter: Letter): Tile {
    return new Tile(id, letter);
  }

  equals(other: Tile): boolean {
    return this.id === other.id;
  }
}

class TilePool {
  get snapshot(): TilePoolSnapshot {
    return { capacity: this.capacity, tiles: [...this.tiles] };
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

  get tileCount(): number {
    return this.tiles.length;
  }

  get tileIdsView(): ReadonlyArray<TileId> {
    return this.tileIds;
  }

  private readonly tileIds: Array<TileId>;

  private constructor(
    private readonly capacity: number | undefined,
    private readonly tiles: Array<Tile>,
  ) {
    this.tileIds = tiles.map(tile => tile.id);
  }

  static create({ capacity, tiles }: { capacity?: number; tiles?: Array<Tile> } = {}): TilePool {
    return new TilePool(capacity, tiles ?? []);
  }

  static restoreFromSnapshot(snapshot: TilePoolSnapshot): TilePool {
    return new TilePool(snapshot.capacity, snapshot.tiles);
  }

  addTile(tile: Tile): void {
    if (this.tileIds.includes(tile.id)) throw new Error(`Tile ${tile} is already present`);
    this.validateCapacity({ newTileCount: this.tiles.length + 1 });
    this.tiles.push(tile);
    this.tileIds.push(tile.id);
  }

  discardTile(tileId: TileId): Tile {
    const index = this.tileIds.indexOf(tileId);
    if (index === -1) throw new Error('Tile absent');
    this.tileIds.splice(index, 1);
    const [removedTile] = this.tiles.splice(index, 1);
    return removedTile;
  }

  popTile(): Tile {
    const tile = this.tiles.pop();
    if (!tile) throw new Error('No tiles left to draw');
    this.tileIds.pop();
    return tile;
  }

  private validateCapacity({ newTileCount }: { newTileCount: number }): void {
    if (this.capacity !== undefined && newTileCount > this.capacity) throw new Error('Rack limit exceeded');
  }
}

export default class Inventory {
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

  private static readonly PLAYER_POOL_CAPACITY = 7;

  private static readonly TILE_BY_ID: ReadonlyMap<TileId, Tile> = new Map(
    Object.values(Letter).flatMap(letter =>
      Array.from({ length: Inventory.LETTER_CONFIG[letter].distribution }, (_, i) => {
        const id = `${letter}-${i}` as TileId;
        return [id, Tile.create(id, letter)] as const;
      }),
    ),
  );

  get snapshot(): InventorySnapshot {
    return {
      discardPool: this.discardPool.snapshot,
      drawPool: this.drawPool.snapshot,
      playerPools: new Map([...this.playerPools].map(([player, pool]) => [player, pool.snapshot])),
    };
  }

  get unusedTilesCount(): number {
    return this.drawPool.tileCount;
  }

  private constructor(
    private drawPool: TilePool,
    private playerPools: Map<Player, TilePool>,
    private discardPool: TilePool,
  ) {}

  static create(players: ReadonlyArray<Player>): Inventory {
    const tiles = [...Inventory.TILE_BY_ID.values()];
    shuffleWithFisherYates(tiles);
    const drawPool = TilePool.create({ tiles });
    const playerPools = new Map(
      players.map(player => [player, TilePool.create({ capacity: this.PLAYER_POOL_CAPACITY })]),
    );
    const discardPool = TilePool.create();
    const inventory = new Inventory(drawPool, playerPools, discardPool);
    inventory.initializePlayerPools();
    return inventory;
  }

  static restoreFromSnapshot(snapshot: InventorySnapshot): Inventory {
    const drawPool = TilePool.restoreFromSnapshot(snapshot.drawPool);
    const playerPools = new Map(
      [...snapshot.playerPools].map(([player, pool]) => [player, TilePool.restoreFromSnapshot(pool)]),
    );
    const discardPool = TilePool.restoreFromSnapshot(snapshot.discardPool);
    return new Inventory(drawPool, playerPools, discardPool);
  }

  areTilesEqual(firstTile: TileId, secondTile: TileId): boolean {
    return this.getTileById(firstTile).equals(this.getTileById(secondTile));
  }

  discardTile({ player, tile }: { player: Player; tile: TileId }): void {
    const removedTile = this.getTilePoolFor(player).discardTile(tile);
    this.discardPool.addTile(removedTile);
  }

  getTileCollectionFor(player: Player): TileCollection {
    return this.getTilePoolFor(player).tileCollection;
  }

  getTileLetter(tileId: TileId): Letter {
    return this.getTileById(tileId).letter;
  }

  getTilePoints(tileId: TileId): number {
    const letter = this.getTileLetter(tileId);
    return Inventory.LETTER_CONFIG[letter].points;
  }

  getTilesFor(player: Player): ReadonlyArray<TileId> {
    return this.getTilePoolFor(player).tileIdsView;
  }

  hasTilesFor(player: Player): boolean {
    return this.getTilePoolFor(player).tileCount > 0;
  }

  replenishTilesFor(player: Player): void {
    const pool = this.getTilePoolFor(player);
    this.replenishPlayerPool(pool);
  }

  private getTileById(tileId: TileId): Tile {
    const tile = Inventory.TILE_BY_ID.get(tileId);
    if (!tile) throw new Error(`Can't find tile ${tileId}`);
    return tile;
  }

  private getTilePoolFor(player: Player): TilePool {
    const pool = this.playerPools.get(player);
    if (!pool) throw new Error('Player pool not found');
    return pool;
  }

  private initializePlayerPools(): void {
    this.playerPools.forEach(pool => this.replenishPlayerPool(pool));
  }

  private replenishPlayerPool(pool: TilePool): void {
    const drawCount = Math.min(Inventory.PLAYER_POOL_CAPACITY - pool.tileCount, this.unusedTilesCount);
    for (let i = 0; i < drawCount; i++) {
      pool.addTile(this.drawPool.popTile());
    }
  }
}
