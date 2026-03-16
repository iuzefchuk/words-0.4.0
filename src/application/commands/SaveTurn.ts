import { GameContext } from '@/application/Game.ts';
import { TileId } from '@/domain/models/Inventory.ts';
import { ValidationError } from '@/domain/models/TurnHistory.ts';

export default class SaveTurn {
  static execute(context: GameContext): ValidationError | null {
    const { turnDirector, inventory } = context;
    if (turnDirector.currentTurnError) return turnDirector.currentTurnError;
    const player = turnDirector.currentPlayer;
    const tiles = turnDirector.currentTurnTileSequence;
    if (!tiles) throw new Error('Current turn tile sequence does not exist');
    turnDirector.saveCurrentTurn();
    tiles.forEach((tile: TileId) => inventory.discardTile({ player, tile }));
    inventory.replenishTilesFor(player);
    return null;
  }
}
