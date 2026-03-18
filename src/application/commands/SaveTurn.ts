import { GameContext, SaveTurnResult } from '@/application/types.ts';
import { TileId } from '@/domain/models/Inventory.ts';

export default class SaveTurn {
  static execute(context: GameContext): SaveTurnResult {
    const { turnDirector, inventory } = context;
    if (turnDirector.currentTurnError) return { ok: false, error: turnDirector.currentTurnError };
    const player = turnDirector.currentPlayer;
    const tiles = turnDirector.currentTurnTileSequence;
    const words = turnDirector.currentTurnWords;
    if (!tiles) throw new Error('Current turn tile sequence does not exist');
    if (!words) throw new Error('Current turn words do not exist');
    turnDirector.saveCurrentTurn();
    tiles.forEach((tile: TileId) => inventory.discardTile({ player, tile }));
    inventory.replenishTilesFor(player);
    return { ok: true, value: { words } };
  }
}
