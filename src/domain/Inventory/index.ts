import { shuffleArrayWithFisherYates } from '@/shared/helpers.ts';
import { Player, Letter } from '@/domain/enums.ts';
import { LETTER_DISTRIBUTION, LETTER_POINTS } from '@/domain/Inventory/constants.ts';
import { TileId, TileCollection } from '@/domain/Inventory/types/shared.ts';

export default class Inventory {
  private static readonly tilesPerRack = 7;

  private constructor(
    private unusedBag: Array<Tile>,
    private racks: Map<Player, Rack>,
    private discardedBag: Array<Tile>,
    private readonly tileIndex: Map<TileId, Tile>,
  ) {
    this.initializeRacks();
  }

  static create({ players }: { players: Array<Player> }): Inventory {
    const unusedBag = shuffleArrayWithFisherYates(
      Object.values(Letter).flatMap(type =>
        Array.from({ length: LETTER_DISTRIBUTION[type] }, () => Tile.create({ letter: type })),
      ),
    );
    const racks = new Map(players.map(player => [player, Rack.create({ maxLimit: this.tilesPerRack })]));
    const discardedBag: Array<Tile> = [];
    const tileIndex = new Map<TileId, Tile>(unusedBag.map(tile => [tile.id, tile]));
    return new Inventory(unusedBag, racks, discardedBag, tileIndex);
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

  private initializeRacks(): void {
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
    const tile = this.tileIndex.get(tileId);
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
