import { GameContext } from '@/application/types.ts';
import TurnValidator from '@/application/services/TurnValidator.ts';
import { TileId } from '@/domain/models/Inventory.ts';

export default class UndoPlaceTile {
  static execute(context: GameContext, { tile }: { tile: TileId }): void {
    context.turnDirector.undoPlaceTile({ tile });
    const result = TurnValidator.execute(context, context.turnDirector.currentTurnPlacement);
    context.turnDirector.setCurrentTurnValidation(result);
  }
}
