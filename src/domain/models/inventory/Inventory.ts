import { Letter, Player } from '@/domain/enums.ts';
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
    if (this.tiles.includes(tile)) throw new Error(`Tile ${tile} is already present`);
    this.validateCapacity(this.tiles.length + 1);
    this.tiles.push(tile);
  }

  popTile(): Tile {
    const tile = this.tiles.pop();
    if (tile === undefined) throw new Error('No tiles left');
    return tile;
  }

  removeTile(tile: Tile): Tile {
    const index = this.tiles.indexOf(tile);
    const [removedTile] = this.tiles.splice(index, 1);
    if (removedTile === undefined) throw new ReferenceError(`Tile ${tile} absent`);
    return removedTile;
  }

  private validateCapacity(newTileCount: number): void {
    if (this.capacity !== undefined && newTileCount > this.capacity) throw new Error('Tiles limit exceeded');
  }
}

export default class Inventory {
  static readonly PLAYER_POOL_CAPACITY = 7;

  private static readonly LETTER_CONFIG: Record<Letter, { count: number; points: number }> = {
    [Letter.A]: { count: 9, points: 1 },
    [Letter.B]: { count: 2, points: 4 },
    [Letter.C]: { count: 2, points: 4 },
    [Letter.D]: { count: 4, points: 2 },
    [Letter.E]: { count: 12, points: 1 },
    [Letter.F]: { count: 2, points: 4 },
    [Letter.G]: { count: 3, points: 3 },
    [Letter.H]: { count: 2, points: 4 },
    [Letter.I]: { count: 9, points: 1 },
    [Letter.J]: { count: 1, points: 10 },
    [Letter.K]: { count: 1, points: 5 },
    [Letter.L]: { count: 4, points: 1 },
    [Letter.M]: { count: 2, points: 3 },
    [Letter.N]: { count: 6, points: 1 },
    [Letter.O]: { count: 8, points: 1 },
    [Letter.P]: { count: 2, points: 4 },
    [Letter.Q]: { count: 1, points: 10 },
    [Letter.R]: { count: 6, points: 1 },
    [Letter.S]: { count: 4, points: 1 },
    [Letter.T]: { count: 6, points: 1 },
    [Letter.U]: { count: 4, points: 2 },
    [Letter.V]: { count: 2, points: 4 },
    [Letter.W]: { count: 2, points: 4 },
    [Letter.X]: { count: 1, points: 8 },
    [Letter.Y]: { count: 2, points: 4 },
    [Letter.Z]: { count: 1, points: 10 },
  };

  private static readonly LETTER_BY_TILE: ReadonlyMap<Tile, Letter> = new Map(
    Object.values(Letter).flatMap(letter =>
      Array.from({ length: Inventory.LETTER_CONFIG[letter].count }, (_, i) => {
        const tile = `${letter}-${i}` as Tile;
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
    private drawPool: TilePool,
    private playerPools: ReadonlyMap<Player, TilePool>,
    private discardPool: TilePool,
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

  static create(players: ReadonlyArray<Player>, randomizer: () => number): Inventory {
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

  discardTile({ player, tile }: { player: Player; tile: Tile }): void {
    const removedTile = this.getTilePoolFor(player).removeTile(tile);
    this.discardPool.addTile(removedTile);
  }

  getTileCollectionFor(player: Player): TileCollection {
    const tiles = this.getTilesFor(player);
    const collection = new Map<Letter, Array<Tile>>();
    for (const tile of tiles) {
      const letter = this.getTileLetter(tile);
      let letterArray = collection.get(letter);
      if (!letterArray) collection.set(letter, (letterArray = []));
      letterArray.push(tile);
    }
    return collection;
  }

  getTileLetter(tile: Tile): Letter {
    const letter = Inventory.LETTER_BY_TILE.get(tile);
    if (letter === undefined) throw new ReferenceError('Letter must be defined');
    return letter;
  }

  getTilePoints(tile: Tile): number {
    const letter = this.getTileLetter(tile);
    return Inventory.LETTER_CONFIG[letter].points;
  }

  getTilesFor(player: Player): ReadonlyArray<Tile> {
    return this.getTilePoolFor(player).tilesView;
  }

  hasTilesFor(player: Player): boolean {
    return this.getTilePoolFor(player).tileCount > 0;
  }

  replenishTilesFor(player: Player): void {
    const pool = this.getTilePoolFor(player);
    this.replenishPlayerPool(pool);
  }

  private getTilePoolFor(player: Player): TilePool {
    const pool = this.playerPools.get(player);
    if (pool === undefined) throw new ReferenceError('Tile pool must be defined');
    return pool;
  }

  private initializePlayerPools(): void {
    this.playerPools.forEach(pool => this.replenishPlayerPool(pool));
  }

  private replenishPlayerPool(pool: TilePool): void {
    const drawCount = Math.min(Inventory.PLAYER_POOL_CAPACITY - pool.tileCount, this.unusedTilesCount);
    for (let i = 0; i < drawCount; i++) pool.addTile(this.drawPool.popTile());
  }
}
