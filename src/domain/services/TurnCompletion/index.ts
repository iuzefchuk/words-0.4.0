import { Player } from '@/domain/enums.ts';
import { GameContext } from '@/domain/types.ts';
import { Inventory } from '@/domain/model/Inventory/types.ts';
import { TileId } from '@/domain/model/Inventory/types.ts';

export default class TurnCompletion {
  static execute(context: Pick<GameContext, 'inventory' | 'turnkeeper'>, player: Player): void {
    const { turnkeeper, inventory } = context;
    const tiles = turnkeeper.currentTurnTileSequence;
    if (!tiles) throw new Error('Current turn tile sequence does not exist');
    turnkeeper.saveCurrentTurn();
    this.discardTiles(inventory, player, tiles);
    inventory.replenishTilesFor(player);
  }

  private static discardTiles(inventory: Inventory, player: Player, tiles: ReadonlyArray<TileId>): void {
    tiles.forEach((tile: TileId) => inventory.discardTile({ player, tileId: tile }));
  }
}
