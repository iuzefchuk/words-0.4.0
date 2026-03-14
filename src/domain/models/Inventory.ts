import { shuffleArrayWithFisherYates } from '@/shared/helpers.ts';
import { Letter, Player } from '@/domain/enums.ts';

export type TileId = string;

export type TileCollection = Map<Letter, Array<TileId>>;

export default class Inventory {
  private static readonly rackCapacity = 7;

  private constructor(
    private drawPool: Array<Tile>,
    private racks: Map<Player, Rack>,
    private discardPool: Array<Tile>,
    private readonly tileById: Map<TileId, Tile>,
  ) {
    this.initializeRacks();
  }

  static create({ players }: { players: Array<Player> }): Inventory {
    const drawPool = shuffleArrayWithFisherYates(
      Object.values(Letter).flatMap(letter =>
        Array.from({ length: LETTER_DISTRIBUTION[letter] }, () => Tile.create({ letter })),
      ),
    );
    const racks = new Map(players.map(player => [player, Rack.create({ maxLimit: this.rackCapacity })]));
    const discardPool: Array<Tile> = [];
    const tileById = new Map<TileId, Tile>(drawPool.map(tile => [tile.id, tile]));
    return new Inventory(drawPool, racks, discardPool, tileById);
  }

  get unusedTilesCount(): number {
    return this.drawPool.length;
  }

  getTilesFor(player: Player): ReadonlyArray<TileId> {
    return this.getRackFor(player).tileIds;
  }

  getTileCollectionFor(player: Player): TileCollection {
    return this.getRackFor(player).tileCollection;
  }

  areTilesEqual(firstTile: TileId, secondTile: TileId): boolean {
    return this.getTileById(firstTile).equals(this.getTileById(secondTile));
  }

  getTilePoints(tileId: TileId): number {
    return this.getTileById(tileId).points;
  }

  getTileLetter(tileId: TileId): Letter {
    return this.getTileById(tileId).letter;
  }

  replenishTilesFor(player: Player): void {
    const rack = this.getRackFor(player);
    this.replenishRack(rack);
  }

  discardTile({ player, tile }: { player: Player; tile: TileId }): void {
    const removedTile = this.getRackFor(player).discardTile(tile);
    this.discardPool.push(removedTile);
  }

  shuffleTilesFor(player: Player): void {
    this.getRackFor(player).shuffle();
  }

  private initializeRacks(): void {
    this.racks.forEach(rack => this.replenishRack(rack));
  }

  private getRackFor(player: Player): Rack {
    const rack = this.racks.get(player);
    if (!rack) throw new Error('Inventory rack not found');
    return rack;
  }

  private replenishRack(rack: Rack): void {
    const drawCount = Math.min(Inventory.rackCapacity - rack.tileCount, this.unusedTilesCount);
    for (let i = 0; i < drawCount; i++) {
      const tile = this.drawPool.pop();
      if (!tile) throw new Error('No tiles left in inventory');
      rack.addTile(tile);
    }
  }

  private getTileById(tileId: TileId): Tile {
    const tile = this.tileById.get(tileId);
    if (!tile) throw new Error(`Can't find tile ${tileId}`);
    return tile;
  }
}

class Rack {
  private constructor(
    private readonly maxLimit: number,
    private readonly tiles: Array<Tile>,
  ) {}

  static create({ maxLimit }: { maxLimit: number }): Rack {
    const tiles: Array<Tile> = [];
    return new Rack(maxLimit, tiles);
  }

  get tileCount(): number {
    return this.tiles.length;
  }

  get tileIds(): ReadonlyArray<TileId> {
    return this.tiles.map(tile => tile.id);
  }

  get tileCollection(): TileCollection {
    const collection: TileCollection = new Map();
    for (const tile of this.tiles) {
      const tiles = collection.get(tile.letter);
      if (tiles) {
        tiles.push(tile.id);
      } else {
        collection.set(tile.letter, [tile.id]);
      }
    }
    return collection;
  }

  shuffle(): void {
    shuffleArrayWithFisherYates(this.tiles);
  }

  addTile(tile: Tile): void {
    this.ensureTileAbsence(tile);
    this.validateMaxLimit({ newTileCount: this.tiles.length + 1 });
    this.tiles.push(tile);
  }

  discardTile(tileId: TileId): Tile {
    const index = this.tiles.findIndex(tile => tile.id === tileId);
    if (index === -1) throw new Error('Tile absent');
    const [removedTile] = this.tiles.splice(index, 1);
    return removedTile;
  }

  private validateMaxLimit({ newTileCount }: { newTileCount: number }): void {
    if (newTileCount > this.maxLimit) throw new Error('Rack limit exceeded');
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

  static create({ letter }: { letter: Letter }): Tile {
    const id = crypto.randomUUID();
    return new Tile(id, letter);
  }

  get points(): number {
    return LETTER_POINTS[this.letter];
  }

  equals(other: Tile): boolean {
    return this.id === other.id;
  }
}

const LETTER_DISTRIBUTION = {
  [Letter.A]: 10,
  [Letter.B]: 2,
  [Letter.C]: 2,
  [Letter.D]: 5,
  [Letter.E]: 12,
  [Letter.F]: 2,
  [Letter.G]: 3,
  [Letter.H]: 3,
  [Letter.I]: 9,
  [Letter.J]: 1,
  [Letter.K]: 1,
  [Letter.L]: 4,
  [Letter.M]: 2,
  [Letter.N]: 6,
  [Letter.O]: 7,
  [Letter.P]: 2,
  [Letter.Q]: 1,
  [Letter.R]: 6,
  [Letter.S]: 5,
  [Letter.T]: 7,
  [Letter.U]: 4,
  [Letter.V]: 2,
  [Letter.W]: 2,
  [Letter.X]: 1,
  [Letter.Y]: 2,
  [Letter.Z]: 1,
} as const;

const LETTER_POINTS = {
  [Letter.A]: 1,
  [Letter.B]: 4,
  [Letter.C]: 4,
  [Letter.D]: 2,
  [Letter.E]: 1,
  [Letter.F]: 4,
  [Letter.G]: 3,
  [Letter.H]: 4,
  [Letter.I]: 1,
  [Letter.J]: 10,
  [Letter.K]: 5,
  [Letter.L]: 1,
  [Letter.M]: 3,
  [Letter.N]: 1,
  [Letter.O]: 1,
  [Letter.P]: 4,
  [Letter.Q]: 10,
  [Letter.R]: 1,
  [Letter.S]: 1,
  [Letter.T]: 1,
  [Letter.U]: 2,
  [Letter.V]: 4,
  [Letter.W]: 4,
  [Letter.X]: 8,
  [Letter.Y]: 4,
  [Letter.Z]: 10,
} as const;
