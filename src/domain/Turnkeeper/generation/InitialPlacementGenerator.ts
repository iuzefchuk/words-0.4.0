import { Player, Axis, Letter } from '@/domain/enums.ts';
import { GameContext } from '@/domain/types.ts';
import { AnchorCoordinates, CellIndex } from '@/domain/Layout/types/shared.ts';
import { CachedAnchorLettersComputer } from '@/domain/Turnkeeper/types/local/index.ts';
import { Placement } from '@/domain/Turnkeeper/types/shared.ts';
import AnchorLettersComputer from '@/domain/Turnkeeper/computation/AnchorLettersComputer.ts';
import AnchorCellFinder from '@/domain/Turnkeeper/search/AnchorCellFinder.ts';
import PlacementGenerator from '@/domain/Turnkeeper/generation/PlacementGenerator.ts';

export default class InitialPlacementGenerator {
  static *execute(context: GameContext, player: Player): Generator<Placement> {
    const { layout, inventory, turnkeeper } = context;
    const playerTileCollection = inventory.getTileCollectionFor(player);
    if (playerTileCollection.size === 0) return;
    const anchorCells = new AnchorCellFinder(layout, turnkeeper).execute();
    if (anchorCells.size === 0) return;
    const computer = new AnchorLettersComputer(context);
    const lettersComputer = new InitialPlacementGenerator.CachedAnchorLettersComputer(computer);
    for (const cell of anchorCells) {
      for (const axis of Object.values(Axis)) {
        const coords: AnchorCoordinates = { axis, cellIndex: cell };
        for (const placement of PlacementGenerator.execute({ context, lettersComputer, playerTileCollection, coords }))
          yield placement;
      }
    }
  }

  static CachedAnchorLettersComputer = class implements CachedAnchorLettersComputer {
    private cache = new Map<Axis, Map<CellIndex, ReadonlySet<Letter>>>(
      Object.values(Axis).map(axis => [axis, new Map()]),
    );

    constructor(private readonly computer: AnchorLettersComputer) {}

    execute(coords: AnchorCoordinates): ReadonlySet<Letter> {
      const axisCache = this.cache.get(coords.axis)!;
      const cachedResult = axisCache.get(coords.cellIndex);
      if (cachedResult) return cachedResult;
      const newResult = this.computer.execute(coords);
      axisCache.set(coords.cellIndex, newResult);
      return newResult;
    }
  };
}
