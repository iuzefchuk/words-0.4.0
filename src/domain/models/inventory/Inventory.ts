import { GameLetter, GamePlayer } from '@/domain/enums.ts';
import { Tile, TileCollection } from '@/domain/models/inventory/types.ts';
import shuffleWithFisherYates from '@/shared/shuffleWithFisherYates.ts';

class TilePool {
  get tileCount(): number {
    return this.tiles.length;
  }

  get tilesView(): ReadonlyArray<Tile> {
    return this.tiles;
  }

  private constructor(
    private readonly capacity: number | undefined,
    private readonly tiles: Array<Tile>,
  ) {}

  static create({ capacity, tiles }: { capacity?: number; tiles?: Array<Tile> } = {}): TilePool {
    return new TilePool(capacity, tiles ?? []);
  }

  addTile(tile: Tile): void {
    if (this.tiles.includes(tile)) throw new Error(`tile ${tile} is already in pool`);
    this.validateCapacity(this.tiles.length + 1);
    this.tiles.push(tile);
  }

  popTile(): Tile {
    const tile = this.tiles.pop();
    if (tile === undefined) throw new Error('cannot pop tile: pool is empty');
    return tile;
  }

  removeTile(tile: Tile): Tile {
    const index = this.tiles.indexOf(tile);
    if (index === -1) throw new ReferenceError(`tile ${tile} is not in pool`);
    const [removedTile] = this.tiles.splice(index, 1);
    if (removedTile === undefined) throw new ReferenceError(`tile ${tile} is not in pool`);
    return removedTile;
  }

  private validateCapacity(newTileCount: number): void {
    if (this.capacity !== undefined && newTileCount > this.capacity) {
      throw new Error(`cannot add tile: pool capacity ${String(this.capacity)} exceeded`);
    }
  }
}

export default class Inventory {
  static readonly PLAYER_POOL_CAPACITY = 7;

  private static readonly LETTER_CONFIG: Record<GameLetter, { count: number; points: number }> = {
    [GameLetter.A]: { count: 9, points: 1 },
    [GameLetter.B]: { count: 2, points: 4 },
    [GameLetter.C]: { count: 2, points: 4 },
    [GameLetter.D]: { count: 4, points: 2 },
    [GameLetter.E]: { count: 12, points: 1 },
    [GameLetter.F]: { count: 2, points: 4 },
    [GameLetter.G]: { count: 3, points: 3 },
    [GameLetter.H]: { count: 2, points: 4 },
    [GameLetter.I]: { count: 9, points: 1 },
    [GameLetter.J]: { count: 1, points: 10 },
    [GameLetter.K]: { count: 1, points: 5 },
    [GameLetter.L]: { count: 4, points: 1 },
    [GameLetter.M]: { count: 2, points: 3 },
    [GameLetter.N]: { count: 6, points: 1 },
    [GameLetter.O]: { count: 8, points: 1 },
    [GameLetter.P]: { count: 2, points: 4 },
    [GameLetter.Q]: { count: 1, points: 10 },
    [GameLetter.R]: { count: 6, points: 1 },
    [GameLetter.S]: { count: 4, points: 1 },
    [GameLetter.T]: { count: 6, points: 1 },
    [GameLetter.U]: { count: 4, points: 2 },
    [GameLetter.V]: { count: 2, points: 4 },
    [GameLetter.W]: { count: 2, points: 4 },
    [GameLetter.X]: { count: 1, points: 8 },
    [GameLetter.Y]: { count: 2, points: 4 },
    [GameLetter.Z]: { count: 1, points: 10 },
  };

  private static readonly LETTER_BY_TILE: ReadonlyMap<Tile, GameLetter> = new Map(
    Object.values(GameLetter).flatMap(letter =>
      Array.from({ length: Inventory.LETTER_CONFIG[letter].count }, (_, idx) => {
        const tile = `${letter}-${String(idx)}` as Tile;
        return [tile, letter] as const;
      }),
    ),
  );

  get tilesPerPlayer(): number {
    return Inventory.PLAYER_POOL_CAPACITY;
  }

  get unusedTilesCount(): number {
    return this.drawPool.tileCount;
  }

  private constructor(
    private readonly drawPool: TilePool,
    private readonly playerPools: ReadonlyMap<GamePlayer, TilePool>,
    private readonly discardPool: TilePool,
  ) {}

  static clone(source: Inventory): Inventory {
    const extractTiles = (pool: TilePool): Array<Tile> =>
      'tilesView' in pool ? [...pool.tilesView] : [...(pool as unknown as { tiles: Array<Tile> }).tiles];
    const drawPool = TilePool.create({ tiles: extractTiles(source.drawPool) });
    const playerPools = new Map(
      [...source.playerPools].map(
        ([player, pool]) =>
          [player, TilePool.create({ capacity: Inventory.PLAYER_POOL_CAPACITY, tiles: extractTiles(pool) })] as const,
      ),
    );
    const discardPool = TilePool.create({ tiles: extractTiles(source.discardPool) });
    return new Inventory(drawPool, playerPools, discardPool);
  }

  static create(players: ReadonlyArray<GamePlayer>, randomizer: () => number): Inventory {
    const tiles = [...Inventory.LETTER_BY_TILE.keys()];
    shuffleWithFisherYates({ array: tiles, randomizer });
    const drawPool = TilePool.create({ tiles });
    const playerPools = new Map(players.map(player => [player, TilePool.create({ capacity: this.PLAYER_POOL_CAPACITY })]));
    const discardPool = TilePool.create();
    const inventory = new Inventory(drawPool, playerPools, discardPool);
    inventory.initializePlayerPools();
    return inventory;
  }

  areTilesEqual(firstTile: Tile, secondTile: Tile): boolean {
    return firstTile === secondTile;
  }

  discardTile({ player, tile }: { player: GamePlayer; tile: Tile }): void {
    const removedTile = this.getTilePoolFor(player).removeTile(tile);
    this.discardPool.addTile(removedTile);
  }

  getTileCollectionFor(player: GamePlayer): TileCollection {
    const tiles = this.getTilesFor(player);
    const collection = new Map<GameLetter, Array<Tile>>();
    for (const tile of tiles) {
      const letter = this.getTileLetter(tile);
      let letterArray = collection.get(letter);
      if (letterArray === undefined) collection.set(letter, (letterArray = []));
      letterArray.push(tile);
    }
    return collection;
  }

  getTileLetter(tile: Tile): GameLetter {
    const letter = Inventory.LETTER_BY_TILE.get(tile);
    if (letter === undefined) throw new ReferenceError(`expected letter for tile ${tile}, got undefined`);
    return letter;
  }

  getTilePoints(tile: Tile): number {
    const letter = this.getTileLetter(tile);
    return Inventory.LETTER_CONFIG[letter].points;
  }

  getTilesFor(player: GamePlayer): ReadonlyArray<Tile> {
    return this.getTilePoolFor(player).tilesView;
  }

  hasTilesFor(player: GamePlayer): boolean {
    return this.getTilePoolFor(player).tileCount > 0;
  }

  replenishTilesFor(player: GamePlayer): void {
    const pool = this.getTilePoolFor(player);
    this.replenishPlayerPool(pool);
  }

  private getTilePoolFor(player: GamePlayer): TilePool {
    const pool = this.playerPools.get(player);
    if (pool === undefined) throw new ReferenceError(`expected tile pool for player ${player}, got undefined`);
    return pool;
  }

  private initializePlayerPools(): void {
    this.playerPools.forEach(pool => {
      this.replenishPlayerPool(pool);
    });
  }

  private replenishPlayerPool(pool: TilePool): void {
    const drawCount = Math.min(Inventory.PLAYER_POOL_CAPACITY - pool.tileCount, this.unusedTilesCount);
    for (let idx = 0; idx < drawCount; idx++) pool.addTile(this.drawPool.popTile());
  }
}
