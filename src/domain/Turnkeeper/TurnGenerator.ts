import { Player, Axis } from '@/domain/enums.ts';
import { GameContext } from '@/domain/types.ts';
import { AnchorCoordinates } from '@/domain/Layout/types.ts';
import { Placement } from '@/domain/Turnkeeper/types.ts';
import AnchorLettersComputer from '@/domain/Turnkeeper/AnchorLettersComputer.ts';
import AnchorCellFinder from '@/domain/Turnkeeper/AnchorCellFinder.ts';
import PlacementGenerator from '@/domain/Turnkeeper/PlacementGenerator.ts';

export default class TurnGenerator {
  static *execute(context: GameContext, player: Player): Generator<Placement> {
    const { inventory } = context;
    const playerTileCollection = inventory.getTileCollectionFor(player);
    if (playerTileCollection.size === 0) return;
    const anchorCells = AnchorCellFinder.execute(context);
    if (anchorCells.size === 0) return;
    const lettersComputer = new AnchorLettersComputer(context);
    for (const cell of anchorCells) {
      for (const axis of Object.values(Axis)) {
        const coords: AnchorCoordinates = { axis, cell };
        for (const placement of PlacementGenerator.execute({ context, lettersComputer, playerTileCollection, coords }))
          yield placement;
      }
    }
  }
}
