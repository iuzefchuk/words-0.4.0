import { Player, Axis, Letter } from '@/domain/enums.ts';
import { GameContext } from '@/domain/types.ts';
import { Inventory } from '@/domain/Inventory/types/shared.ts';
import { Layout } from '@/domain/Layout/types/shared.ts';
import { AnchorCoordinates, CellIndex } from '@/domain/Layout/types/shared.ts';
import { CachedAnchorLettersComputer } from '@/domain/Turnkeeper/types/local/index.ts';
import { Turnkeeper, Placement } from '@/domain/Turnkeeper/types/shared.ts';
import AnchorLettersComputer from '@/domain/Turnkeeper/computation/AnchorLettersComputer.ts';
import AnchorCellFinder from '@/domain/Turnkeeper/search/AnchorCellFinder.ts';
import PlacementGenerator from '@/domain/Turnkeeper/generation/PlacementGenerator.ts';

export default class InitialPlacementGenerator {
  constructor(private readonly context: GameContext) {}

  private get layout(): Layout {
    return this.context.layout;
  }
  private get inventory(): Inventory {
    return this.context.inventory;
  }
  private get turnkeeper(): Turnkeeper {
    return this.context.turnkeeper;
  }

  *execute(player: Player): Generator<Placement> {
    const playerTileCollection = this.inventory.getTileCollectionFor(player);
    if (playerTileCollection.size === 0) return;
    const anchorCells = new AnchorCellFinder(this.layout, this.turnkeeper).execute();
    if (anchorCells.size === 0) return;
    const computer = new AnchorLettersComputer(this.context);
    const cachedComputer = new InitialPlacementGenerator.CachedAnchorLettersComputer(computer);
    for (const cell of anchorCells) {
      for (const axis of Object.values(Axis)) {
        const coords: AnchorCoordinates = { axis, index: cell };
        const generator = new PlacementGenerator(this.context, cachedComputer);
        for (const placement of generator.execute({ playerTileCollection, coords })) yield placement;
      }
    }
  }

  static CachedAnchorLettersComputer = class implements CachedAnchorLettersComputer {
    private cache = new Map<Axis, Map<CellIndex, ReadonlySet<Letter>>>(
      Object.values(Axis).map(axis => [axis, new Map()]),
    );

    constructor(private readonly computer: AnchorLettersComputer) {}

    find(coords: AnchorCoordinates): ReadonlySet<Letter> {
      const axisCache = this.cache.get(coords.axis)!;
      const cachedResult = axisCache.get(coords.index);
      if (cachedResult) return cachedResult;
      const newResult = this.computer.execute(coords);
      axisCache.set(coords.index, newResult);
      return newResult;
    }
  };
}
