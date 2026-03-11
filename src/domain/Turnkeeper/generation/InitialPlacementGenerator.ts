import { Player, Axis } from '@/domain/enums.ts';
import { GameContext } from '@/domain/types.ts';
import { AnchorCoordinates } from '@/domain/Layout/types/shared.ts';
import { Placement } from '@/domain/Turnkeeper/types/shared.ts';
import AnchorLettersComputer from '@/domain/Turnkeeper/computation/AnchorLettersComputer.ts';
import AnchorCellFinder from '@/domain/Turnkeeper/search/AnchorCellFinder.ts';
import PlacementGenerator from '@/domain/Turnkeeper/generation/PlacementGenerator.ts';

export default class InitialPlacementGenerator {
  static *execute(context: GameContext, args: { player: Player }): Generator<Placement> {
    const { inventory } = context;
    const { player } = args;
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
