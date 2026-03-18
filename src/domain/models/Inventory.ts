import { shuffleArrayWithFisherYates } from '@/shared/helpers.ts';
import { Letter, Player } from '@/domain/enums.ts';
import { IdGenerator } from '@/shared/ports.ts';
import { Brand } from '@/shared/brand.ts';

export type TileId = Brand<string, 'TileId'>;

export type TileCollection = Map<Letter, Array<TileId>>;

export default class Inventory {
  private static readonly RACK_CAPACITY = 7;

  private constructor(
    private drawPool: Array<Tile>,
    private racks: Map<Player, Rack>,
    private discardPool: Array<Tile>,
    private readonly tileById: Map<TileId, Tile>,
  ) {
    this.initializeRacks();
  }

  static create({ players, idGenerator }: { players: ReadonlyArray<Player>; idGenerator: IdGenerator }): Inventory {
    const drawPool = shuffleArrayWithFisherYates(
      Object.values(Letter).flatMap(letter =>
        Array.from({ length: LETTER_CONFIG[letter].distribution }, () => Tile.create({ letter, idGenerator })),
      ),
    );
    const racks = new Map(players.map(player => [player, Rack.create({ maxLimit: this.RACK_CAPACITY })]));
    const discardPool: Array<Tile> = [];
    const tileById = new Map<TileId, Tile>(drawPool.map(tile => [tile.id, tile]));
    return new Inventory(drawPool, racks, discardPool, tileById);
  }

  static hydrate(data: unknown): Inventory {
    const inventory = Object.setPrototypeOf(data, Inventory.prototype) as Inventory;
    for (const rack of inventory.racks.values()) Rack.hydrate(rack);
    for (const tile of inventory.tileById.values()) Tile.hydrate(tile);
    for (const tile of inventory.drawPool) Tile.hydrate(tile);
    for (const tile of inventory.discardPool) Tile.hydrate(tile);
    return inventory;
  }

  get unusedTilesCount(): number {
    return this.drawPool.length;
  }

  getTilesFor(player: Player): ReadonlyArray<TileId> {
    return this.getRackFor(player).tileIds;
  }

  hasTilesFor(player: Player): boolean {
    return this.getRackFor(player).tileCount > 0;
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
    const drawCount = Math.min(Inventory.RACK_CAPACITY - rack.tileCount, this.unusedTilesCount);
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

  static hydrate(data: unknown): Rack {
    const rack = Object.setPrototypeOf(data, Rack.prototype) as Rack;
    for (const tile of rack.tiles) Tile.hydrate(tile);
    return rack;
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

  static create({ letter, idGenerator }: { letter: Letter; idGenerator: IdGenerator }): Tile {
    const id = idGenerator.execute() as TileId;
    return new Tile(id, letter);
  }

  static hydrate(data: unknown): Tile {
    return Object.setPrototypeOf(data, Tile.prototype);
  }

  get points(): number {
    return LETTER_CONFIG[this.letter].points;
  }

  equals(other: Tile): boolean {
    return this.id === other.id;
  }
}

const LETTER_CONFIG: Record<Letter, { distribution: number; points: number }> = {
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
