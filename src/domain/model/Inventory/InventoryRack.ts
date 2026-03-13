import { shuffleArrayWithFisherYates } from '@/shared/helpers.ts';
import { TileId, TileCollection } from '@/domain/model/Inventory/types.ts';
import InventoryTile from '@/domain/model/Inventory/InventoryTile.ts';

export default class InventoryRack {
  private constructor(
    private readonly maxLimit: number,
    private readonly tiles: Array<InventoryTile>,
  ) {}

  static create({ maxLimit }: { maxLimit: number }): InventoryRack {
    const tiles: Array<InventoryTile> = [];
    return new InventoryRack(maxLimit, tiles);
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

  addTile(tile: InventoryTile): void {
    this.ensureTileAbsence(tile);
    this.validateMaxLimit({ newTileCount: this.tiles.length + 1 });
    this.tiles.push(tile);
  }

  discardTile(tileId: TileId): InventoryTile {
    const index = this.tiles.findIndex(tile => tile.id === tileId);
    if (index === -1) throw new Error('Tile absent');
    const [removedTile] = this.tiles.splice(index, 1);
    return removedTile;
  }

  private validateMaxLimit({ newTileCount }: { newTileCount: number }): void {
    if (newTileCount > this.maxLimit) throw new Error('Rack limit exceeded');
  }

  private ensureTileAbsence(tile: InventoryTile): void {
    if (this.tiles.some(tileInArray => tile.equals(tileInArray))) {
      throw new Error(`Tile ${tile} is already present`);
    }
  }
}
