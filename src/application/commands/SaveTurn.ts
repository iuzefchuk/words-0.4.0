import { GameContext } from '@/application/types.ts';
import { TileId } from '@/domain/models/Inventory.ts';

export default class SaveTurn {
  static execute(context: GameContext): void {
    const { turnDirector, inventory } = context;
    const player = turnDirector.currentPlayer;
    const tiles = turnDirector.currentTurnTileSequence;
    if (!tiles) throw new Error('Current turn tile sequence does not exist');
    turnDirector.saveCurrentTurn();
    tiles.forEach((tile: TileId) => inventory.discardTile({ player, tileId: tile }));
    inventory.replenishTilesFor(player);
  }
}
