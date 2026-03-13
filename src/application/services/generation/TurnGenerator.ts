import { Player, Axis } from '@/domain/enums.ts';
import { Placement } from '@/domain/types.ts';
import { GameContext } from '@/application/types.ts';
import { AnchorCoordinates } from '@/domain/reference/Layout/types.ts';
import AnchorLettersComputer from '@/domain/rules/AnchorLettersComputer.ts';
import PlacementGenerator from '@/application/services/generation/PlacementGenerator.ts';

export default class TurnGenerator {
  static *execute(context: GameContext, player: Player): Generator<Placement> {
    const { inventory, board, dictionary, turnkeeper } = context;
    const playerTileCollection = inventory.getTileCollectionFor(player);
    if (playerTileCollection.size === 0) return;
    const anchorCells = board.getAnchorCells(turnkeeper.historyIsEmpty);
    if (anchorCells.size === 0) return;
    const lettersComputer = new AnchorLettersComputer(board, dictionary, inventory);
    for (const cell of anchorCells) {
      for (const axis of Object.values(Axis)) {
        const coords: AnchorCoordinates = { axis, cell };
        for (const placement of PlacementGenerator.execute({ context, lettersComputer, playerTileCollection, coords }))
          yield placement;
      }
    }
  }
}
