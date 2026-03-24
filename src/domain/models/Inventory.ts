import { Letter, Player } from '@/domain/enums.ts';
import { IdGenerator } from '@/shared/ports.ts';
import shuffleWithFisherYates from '@/shared/shuffleWithFisherYates.ts';

export type TileId = Brand<string, 'TileId'>;

export type TileCollection = ReadonlyMap<Letter, ReadonlyArray<TileId>>;

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
    private drawPool: TilePool,
    private poolByPlayer: Map<Player, TilePool>,
    private discardPool: TilePool,
    private readonly tileById: Map<TileId, Tile>,
  ) {
    this.initializePlayerPools();
  }

  static create(players: ReadonlyArray<Player>, idGenerator: IdGenerator): Inventory {
    const tiles = this.shuffleTilesWithFisherYates(
      Object.values(Letter).flatMap(letter =>
        Array.from({ length: Inventory.LETTER_CONFIG[letter].distribution }, () =>
          Tile.create({ letter, idGenerator }),
        ),
      ),
    );
    const tileById = new Map<TileId, Tile>(tiles.map(tile => [tile.id, tile]));
    const drawPool = TilePool.create({ tiles });
    const poolByPlayer = new Map(
      players.map(player => [player, TilePool.create({ capacity: this.PLAYER_POOL_CAPACITY })]),
    );
    const discardPool = TilePool.create();
    return new Inventory(drawPool, poolByPlayer, discardPool, tileById);
  }

  static reconstruct(data: unknown): Inventory {
    const inventory = Object.setPrototypeOf(data, Inventory.prototype) as {
      drawPool: unknown;
      poolByPlayer: Map<unknown, unknown>;
      discardPool: unknown;
      tileById: Map<unknown, unknown>;
    };
    TilePool.reconstruct(inventory.drawPool);
    for (const pool of inventory.poolByPlayer.values()) TilePool.reconstruct(pool);
    TilePool.reconstruct(inventory.discardPool);
    for (const tile of inventory.tileById.values()) Tile.reconstruct(tile);
    return inventory as unknown as Inventory;
  }

  static shuffleTilesWithFisherYates(tiles: Array<Tile>): Array<Tile> {
    return shuffleWithFisherYates(tiles);
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
    this.poolByPlayer.forEach(pool => this.replenishPlayerPool(pool));
  }

  private getTilePoolFor(player: Player): TilePool {
    const pool = this.poolByPlayer.get(player);
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
  private constructor(
    private readonly capacity: number | undefined,
    private readonly tiles: Array<Tile>,
  ) {}

  static create({ capacity, tiles }: { capacity?: number; tiles?: Array<Tile> } = {}): TilePool {
    return new TilePool(capacity, tiles ?? []);
  }

  static reconstruct(data: unknown): TilePool {
    const pool = Object.setPrototypeOf(data, TilePool.prototype) as { tiles: Array<unknown> };
    for (const tile of pool.tiles) Tile.reconstruct(tile);
    return pool as unknown as TilePool;
  }

  get tileCount(): number {
    return this.tiles.length;
  }

  get tileIds(): ReadonlyArray<TileId> {
    return this.tiles.map(tile => tile.id);
  }

  get tileCollection(): TileCollection {
    const collection = new Map<Letter, ReadonlyArray<TileId>>();
    for (const tile of this.tiles) {
      const existing = collection.get(tile.letter);
      if (existing) {
        collection.set(tile.letter, [...existing, tile.id]);
      } else {
        collection.set(tile.letter, [tile.id]);
      }
    }
    return collection;
  }

  addTile(tile: Tile): void {
    this.ensureTileAbsence(tile);
    this.validateCapacity({ newTileCount: this.tiles.length + 1 });
    this.tiles.push(tile);
  }

  discardTile(tileId: TileId): Tile {
    const index = this.tiles.findIndex(tile => tile.id === tileId);
    if (index === -1) throw new Error('Tile absent');
    const [removedTile] = this.tiles.splice(index, 1);
    return removedTile;
  }

  popTile(): Tile {
    const tile = this.tiles.pop();
    if (!tile) throw new Error('No tiles left to draw');
    return tile;
  }

  private validateCapacity({ newTileCount }: { newTileCount: number }): void {
    if (this.capacity !== undefined && newTileCount > this.capacity) throw new Error('Rack limit exceeded');
  }

  private ensureTileAbsence(tile: Tile): void {
    if (this.tiles.some(tileInArray => tile.equals(tileInArray))) {
      throw new Error(`Tile ${tile} is already present`);
    }
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

  static reconstruct(data: unknown): Tile {
    return Object.setPrototypeOf(data, Tile.prototype) as Tile;
  }

  equals(other: Tile): boolean {
    return this.id === other.id;
  }
}
