import { GameContext } from '@/domain/types.ts';
import { Axis, Letter } from '@/domain/enums.ts';
import { Dictionary } from '@/domain/Dictionary/types/shared.ts';
import { Inventory } from '@/domain/Inventory/types/shared.ts';
import { AnchorCoordinates, CellIndex, Layout } from '@/domain/Layout/types/shared.ts';
import { Turnkeeper } from '@/domain/Turnkeeper/types/shared.ts';

export default class AnchorLettersComputer {
  private cache = new Map<Axis, Map<CellIndex, ReadonlySet<Letter>>>(
    Object.values(Axis).map(axis => [axis, new Map()]),
  );

  constructor(private readonly context: GameContext) {}

  private get layout(): Layout {
    return this.context.layout;
  }
  private get dictionary(): Dictionary {
    return this.context.dictionary;
  }
  private get inventory(): Inventory {
    return this.context.inventory;
  }
  private get turnkeeper(): Turnkeeper {
    return this.context.turnkeeper;
  }

  findFor(coords: AnchorCoordinates): ReadonlySet<Letter> {
    const { axis, cell } = coords;
    const axisCache = this.cache.get(axis);
    if (!axisCache) throw new Error('Axis cache has to exist');
    const cachedResult = axisCache.get(cell);
    if (cachedResult) return cachedResult;
    const newResult = this.computeFor(coords);
    axisCache.set(cell, newResult);
    return newResult;
  }

  private computeFor(coords: AnchorCoordinates): ReadonlySet<Letter> {
    const axisCells = this.layout.getAxisCells(coords);
    const position = axisCells.indexOf(coords.cell);
    if (position === -1) throw new Error('Cell not found in axis cells');
    const prefix = this.collectAdjacentTileLetters(axisCells, position, -1);
    const suffix = this.collectAdjacentTileLetters(axisCells, position, 1);
    if (!prefix && !suffix) return this.dictionary.allLetters;
    const prefixNode = prefix ? this.dictionary.getNode(prefix) : this.dictionary.firstNode;
    if (!prefixNode) return new Set();
    const anchorLetters = new Set<Letter>();
    const generator = this.dictionary.createNextNodeGenerator({ startNode: prefixNode });
    for (const [possibleNextLetter, nodeWithPossibleNextLetter] of generator) {
      if (!suffix) {
        anchorLetters.add(possibleNextLetter);
        continue;
      }
      const suffixNode = this.dictionary.getNode(suffix, nodeWithPossibleNextLetter);
      if (suffixNode && this.dictionary.isNodeFinal(suffixNode)) anchorLetters.add(possibleNextLetter);
    }
    return anchorLetters;
  }

  private collectAdjacentTileLetters(
    axisCells: ReadonlyArray<CellIndex>,
    startPosition: number,
    direction: -1 | 1,
  ): string {
    let result = '';
    for (let i = startPosition + direction; i >= 0 && i < axisCells.length; i += direction) {
      const tile = this.turnkeeper.findTileByCell(axisCells[i]);
      if (!tile) break;
      const letter = this.inventory.getTileLetter(tile);
      result = direction === -1 ? letter + result : result + letter;
    }
    return result;
  }
}
