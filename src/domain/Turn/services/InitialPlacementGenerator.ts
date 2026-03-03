import { Dictionary } from '@/domain/Dictionary/Dictionary.js';
import { Inventory, Letter } from '@/domain/Inventory/Inventory.js';
import { Layout, Axis, CellIndex, Coordinates } from '@/domain/Layout/Layout.js';
import { CellUsabilityCalculator } from '@/domain/Layout/services/CellUsabilityCalculator.js';
import { Player } from '@/domain/Player.js';
import { TurnManager, Placement } from '../Turn.js';
import { PlacementComputer } from './PlacementComputer.js';
import { UsableLettersComputer, CachedUsableLettersComputer } from './UsableLettersComputer.js';

export class InitialPlacementGenerator {
  constructor(
    private readonly layout: Layout,
    private readonly dictionary: Dictionary,
    private readonly inventory: Inventory,
    private readonly turnManager: TurnManager,
  ) {}

  execute(player: Player): Placement | null {
    const playerTileCollection = this.inventory.getTileCollectionFor(player);
    if (playerTileCollection.size === 0) return null;
    const availableTargetCells = new CellUsabilityCalculator(this.layout, this.turnManager).getAllUsableAsFirst();
    if (availableTargetCells.length === 0) return null;
    const lettersComputer = new UsableLettersComputer(this.layout, this.dictionary, this.inventory, this.turnManager);
    const cachedLettersComputer = new InitialPlacementGenerator.CachedUsableLettersComputer(lettersComputer);
    for (const cell of availableTargetCells) {
      for (const axis of Object.values(Axis)) {
        const input = new PlacementComputer(
          this.layout,
          this.dictionary,
          this.inventory,
          this.turnManager,
          cachedLettersComputer,
        ).execute({ playerTileCollection, coords: { axis, cell } });
        if (input) return input;
      }
    }
    return null;
  }

  static CachedUsableLettersComputer = class implements CachedUsableLettersComputer {
    private cache = new Map<Axis, Map<CellIndex, ReadonlySet<Letter>>>(
      Object.values(Axis).map(axis => [axis, new Map()]),
    );

    constructor(private readonly computer: UsableLettersComputer) {}

    getFor(coords: Coordinates): ReadonlySet<Letter> {
      const axisCache = this.cache.get(coords.axis)!;
      const cachedResult = axisCache.get(coords.cell);
      if (cachedResult) return cachedResult;
      const newResult = this.computer.execute(coords);
      axisCache.set(coords.cell, newResult);
      return newResult;
    }
  };
}
