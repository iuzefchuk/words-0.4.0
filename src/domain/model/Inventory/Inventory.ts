import { shuffleArrayWithFisherYates } from '@/shared/helpers.ts';
import { Player, Letter } from '@/domain/enums.ts';
import { LETTER_DISTRIBUTION } from '@/domain/model/Inventory/constants.ts';
import { TileId, TileCollection } from '@/domain/model/Inventory/types.ts';
import InventoryRack from '@/domain/model/Inventory/InventoryRack.ts';
import InventoryTile from '@/domain/model/Inventory/InventoryTile.ts';

export default class Inventory {
  private static readonly rackCapacity = 7;

  private constructor(
    private drawPool: Array<InventoryTile>,
    private racks: Map<Player, InventoryRack>,
    private discardPool: Array<InventoryTile>,
    private readonly tileById: Map<TileId, InventoryTile>,
  ) {
    this.initializeRacks();
  }

  static create({ players }: { players: Array<Player> }): Inventory {
    const drawPool = shuffleArrayWithFisherYates(
      Object.values(Letter).flatMap(letter =>
        Array.from({ length: LETTER_DISTRIBUTION[letter] }, () => InventoryTile.create({ letter })),
      ),
    );
    const racks = new Map(players.map(player => [player, InventoryRack.create({ maxLimit: this.rackCapacity })]));
    const discardPool: Array<InventoryTile> = [];
    const tileById = new Map<TileId, InventoryTile>(drawPool.map(tile => [tile.id, tile]));
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

  discardTile({ player, tileId }: { player: Player; tileId: TileId }): void {
    const removedTile = this.getRackFor(player).discardTile(tileId);
    this.discardPool.push(removedTile);
  }

  shuffleTilesFor(player: Player): void {
    this.getRackFor(player).shuffle();
  }

  private initializeRacks(): void {
    this.racks.forEach(rack => this.replenishRack(rack));
  }

  private getRackFor(player: Player): InventoryRack {
    const rack = this.racks.get(player);
    if (!rack) throw new Error('Inventory rack not found');
    return rack;
  }

  private replenishRack(rack: InventoryRack): void {
    const drawCount = Math.min(Inventory.rackCapacity - rack.tileCount, this.unusedTilesCount);
    for (let i = 0; i < drawCount; i++) {
      const tile = this.drawPool.pop();
      if (!tile) throw new Error('No tiles left in inventory');
      rack.addTile(tile);
    }
  }

  private getTileById(tileId: TileId): InventoryTile {
    const tile = this.tileById.get(tileId);
    if (!tile) throw new Error(`Can't find tile ${tileId}`);
    return tile;
  }
}
