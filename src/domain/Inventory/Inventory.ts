import { shuffleArrayWithFisherYates } from '@/shared/helpers.js';
import { Player } from '../Player.js';

export type TileId = string;

export type TileCollection = Map<Letter, Array<TileId>>;

export enum Letter {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  E = 'E',
  F = 'F',
  G = 'G',
  H = 'H',
  I = 'I',
  J = 'J',
  K = 'K',
  L = 'L',
  M = 'M',
  N = 'N',
  O = 'O',
  P = 'P',
  Q = 'Q',
  R = 'R',
  S = 'S',
  T = 'T',
  U = 'U',
  V = 'V',
  W = 'W',
  X = 'X',
  Y = 'Y',
  Z = 'Z',
}

export class Inventory {
  static readonly tilesPerRack = 7;

  private constructor(
    private unusedBag: Array<Tile>,
    private racks: Map<Player, Rack>,
    private discardedBag: Array<Tile>,
  ) {
    this.initializeRacks();
  }

  static create({ players }: { players: Array<Player> }): Inventory {
    const unusedBag = shuffleArrayWithFisherYates(
      Object.values(Letter).flatMap(type => Array(LETTER_DISTRIBUTION[type]).fill(type)),
    );
    const racks = new Map(players.map(player => [player, Rack.create({ maxLimit: this.tilesPerRack })]));
    const discardedBag: Array<Tile> = [];
    return new Inventory(unusedBag, racks, discardedBag);
  }

  get unusedTilesCount(): number {
    return this.unusedBag.length;
  }

  getTilesFor(player: Player): ReadonlyArray<TileId> {
    return this.getRackFor(player).tileIds;
  }

  getTileCollectionFor(player: Player): TileCollection {
    return this.getRackFor(player).tileCollection;
  }

  areTilesEqual(firstTile: TileId, secondTile: TileId): boolean {
    return this.findTileById(firstTile).equals(this.findTileById(secondTile));
  }

  getTilePoints(tileId: TileId): number {
    return this.findTileById(tileId).points;
  }

  getTileLetter(tileId: TileId): Letter {
    return this.findTileById(tileId).letter;
  }

  replenishTilesFor(player: Player): void {
    const rack = this.getRackFor(player);
    this.replenishRack(rack);
  }

  removeTile({ player, tileId }: { player: Player; tileId: TileId }): void {
    const removedTile = this.getRackFor(player).removeTile(tileId);
    this.discardedBag.push(removedTile);
  }

  shuffleTilesFor(player: Player): void {
    this.getRackFor(player).shuffle();
  }

  private initializeRacks() {
    this.racks.forEach(rack => this.replenishRack(rack));
  }

  private getRackFor(player: Player): Rack {
    const rack = this.racks.get(player);
    if (!rack) throw new Error('Inventory rack not found');
    return rack;
  }

  private replenishRack(rack: Rack): void {
    const replenishAmount = Math.min(Inventory.tilesPerRack - rack.tileCount, this.unusedTilesCount);
    for (let i = 0; i < replenishAmount; i++) {
      const tile = this.unusedBag.pop();
      if (!tile) throw new Error('No tiles left in inventory');
      rack.addTile(tile);
    }
  }

  private findTileById(tileId: TileId): Tile {
    const resultInBags = [...this.unusedBag, ...this.discardedBag].find(tile => tile.id === tileId);
    if (resultInBags) return resultInBags;
    for (const player of Object.values(Player)) {
      const rack = this.getRackFor(player);
      const resultInRack = rack.findTileById(tileId);
      if (resultInRack) return resultInRack;
    }
    throw new Error(`Can't find tile ${tileId}`);
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
    this.validateTileAbsence(tile);
    this.validateRackLimit({ newTilesLength: this.tiles.length + 1 });
    this.tiles.push(tile);
  }

  removeTile(tileId: TileId): Tile {
    const index = this.tiles.findIndex(tile => tile.id === tileId);
    if (index === -1) throw new Error('Tile absent');
    const [removedTile] = this.tiles.splice(index, 1);
    return removedTile;
  }

  findTileById(tileId: TileId): Tile | undefined {
    return this.tiles.find(tile => tile.id === tileId);
  }

  private validateRackLimit({ newTilesLength }: { newTilesLength: number }): void {
    if (newTilesLength > this.maxLimit) throw new Error('Rack limit exceeded');
  }

  private validateTileAbsence(validatedTile: Tile): void {
    if (this.tiles.some(tile => tile.equals(validatedTile))) {
      throw new Error(`Tile ${validatedTile} is already present`);
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
