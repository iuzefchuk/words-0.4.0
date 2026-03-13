import { GameContext } from '@/application/types.ts';
import TurnValidator from '@/application/services/TurnValidator.ts';
import { CellIndex } from '@/domain/models/Board.ts';
import { TileId } from '@/domain/models/Inventory.ts';

export default class PlaceTile {
  static execute(context: GameContext, { cell, tile }: { cell: CellIndex; tile: TileId }): void {
    context.turnDirector.placeTile({ cell, tile });
    const result = TurnValidator.execute(context, context.turnDirector.currentTurnPlacement);
    context.turnDirector.setCurrentTurnValidation(result);
  }
}
