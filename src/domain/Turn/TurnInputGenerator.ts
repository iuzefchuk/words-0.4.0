import { Axis, CellIndex, Layout } from '../Layout/Layout.js';
import { LettersCount, TileId } from '../Inventory.js';
import { Placement, TurnInput, TurnManager, TurnStateType } from './Turn.js';
import { LayoutCellUsabilityCalculator } from '../Layout/LayoutCellUsabilityCalculator.js';
import { TurnStateComputer } from './TurnStateComputer.js';
import { Dictionary, FrozenState } from '../Dictionary/Dictionary.js';

type ComputerConfig = {
  playerLettersCount: LettersCount;
  cell: CellIndex;
  axis: Axis;
};

type ComputerIterationConfig = {
  axis: Axis;
  axisCells: ReadonlyArray<CellIndex>;
  cellAxisPosition: number;
  lettersCount: LettersCount;
  placement?: Placement;
  state: FrozenState;
};

export class TurnInputGenerator {
  constructor(private readonly dependencies: Dependencies) {}

  generate({ playerLettersCount }: { playerLettersCount: LettersCount }): TurnInput | null {
    if (playerLettersCount.size === 0) return null;
    const targetCells = this.getAvailableTargetCells();
    if (targetCells.length === 0) return null;
    for (const cell of targetCells) {
      for (const axis of Object.values(Axis)) {
        const input = new TurnInputComputer(this.dependencies).compute({ playerLettersCount, cell, axis });
        if (input) return input;
      }
    }
    return null;
  }

  private getAvailableTargetCells(): ReadonlyArray<CellIndex> {
    const { layout, turnManager } = this.dependencies;
    return new LayoutCellUsabilityCalculator(layout, turnManager).getAllUsableAsFirst();
  }
}

class TurnInputComputer {
  private readonly crossCheckCache: CrossCheckCache;

  constructor(private readonly dependencies: Dependencies) {
    const { layout, dictionary, turnManager } = this.dependencies;
    this.crossCheckCache = new CrossCheckCache(layout, dictionary, turnManager);
  }

  compute({ playerLettersCount, cell, axis }: ComputerConfig): TurnInput | null {
    const { layout, dictionary } = this.dependencies;
    const axisCells = layout.getAxisCells({ axis, targetCell: cell });
    const cellAxisPosition = axisCells.indexOf(cell);
    const state = dictionary.rootState;
    const firstIterationConfig = { axis, axisCells, cellAxisPosition, lettersCount: playerLettersCount, state };
    return this.computeIteration(firstIterationConfig);
  }

  private computeIteration({
    axis,
    axisCells,
    cellAxisPosition,
    lettersCount,
    placement = [],
    state,
  }: ComputerIterationConfig): TurnInput | null {
    const { turnManager, inventory } = this.dependencies;
    const placementIsWord = placement.length > 0 && state.isFinal;
    if (placementIsWord) {
      const input: TurnInput = { initPlacement: [...placement] };
      const turnState = new TurnStateComputer(this.dependencies).compute(input);
      if (turnState.type === TurnStateType.Valid) return input;
    }

    if (cellAxisPosition >= axisCells.length) return null;
    const cell = axisCells[cellAxisPosition];
    if (turnManager.isCellConnected(cell)) return null;
    const allowedTiles = this.crossCheckCache.getAllowedTiles(cell, axis);

    for (const [tile, nextState] of state.transitions) {
      if (!allowedTiles.has(tile)) continue;
      const letter = inventory.getTileLetter(tile);
      const lettersRemaining = lettersCount.get(letter) ?? 0;
      if (lettersRemaining === 0) continue;

      // apply tile
      lettersCount.set(letter, lettersRemaining - 1);
      placement.push({ cell, tile });

      //check for results
      const result = this.computeIteration({
        axis,
        axisCells,
        cellAxisPosition: cellAxisPosition + 1,
        lettersCount,
        placement,
        state: nextState,
      });
      if (result) return result;

      //reverse tile application
      placement.pop();
      lettersCount.set(letter, lettersRemaining);
    }

    return null;
  }
}

class CrossCheckCache {
  private readonly cache = new Map<CellIndex, Set<TileId>>();

  constructor(
    private readonly layout: Layout,
    private readonly dictionary: Dictionary,
    private readonly turnManager: TurnManager,
  ) {}

  getAllowedTiles(cell: CellIndex, axis: Axis): ReadonlySet<TileId> {
    const cached = this.cache.get(cell);
    if (cached) return cached;
    const allowed = this.computeAllowedTiles(cell, axis);
    this.cache.set(cell, allowed);
    return allowed;
  }

  private computeAllowedTiles(cell: CellIndex, axis: Axis): Set<TileId> {
    const crossAxis = axis === Axis.X ? Axis.Y : Axis.X;
    const axisCells = this.layout.getAxisCells({ axis: crossAxis, targetCell: cell });
    const index = axisCells.indexOf(cell);
    let prefix = '';
    for (let i = index - 1; i >= 0; i--) {
      const tile = this.turnManager.findTileByCell(axisCells[i]);
      if (!tile) break;
      prefix = tile + prefix;
    }
    let suffix = '';
    for (let i = index + 1; i < axisCells.length; i++) {
      const tile = this.turnManager.findTileByCell(axisCells[i]);
      if (!tile) break;
      suffix += tile;
    }
    if (prefix === '' && suffix === '') {
      const all = new Set<TileId>();
      this.collectTiles(this.dictionary.rootState, all);
      return all;
    }
    const allowed = new Set<TileId>();
    const all = new Set<TileId>();
    this.collectTiles(this.dictionary.rootState, all);
    for (const letter of all) {
      const word = prefix + letter + suffix;
      if (this.dictionary.hasWord(word)) allowed.add(letter);
    }
    return allowed;
  }

  private collectTiles(state: FrozenState, set: Set<TileId>) {
    for (const [char, child] of state.transitions) {
      if (!set.has(char)) set.add(char);
      this.collectTiles(child, set);
    }
  }
}
