import { Dictionary } from '@/domain/Dictionary/Dictionary.js';
import { Letter, Inventory } from '@/domain/Inventory/Inventory.js';
import { Coordinates, Layout, CellIndex } from '@/domain/Layout/Layout.js';
import { TurnManager } from '../Turn.js';

export type CachedUsableLettersComputer = {
  getFor(coords: Coordinates): ReadonlySet<Letter>;
};

export class UsableLettersComputer {
  constructor(
    private readonly layout: Layout,
    private readonly dictionary: Dictionary,
    private readonly inventory: Inventory,
    private readonly turnManager: TurnManager,
  ) {}

  execute(coords: Coordinates): ReadonlySet<Letter> {
    const axisCells = this.layout.getAxisCells(coords);
    const cellAxisPosition = axisCells.indexOf(coords.cell);
    const prefix = this.getPrefix(axisCells, cellAxisPosition);
    const suffix = this.getSuffix(axisCells, cellAxisPosition);
    if (!prefix && !suffix) return this.dictionary.allLetters;
    const prefixNode = prefix ? this.dictionary.getNodeFor(prefix) : this.dictionary.rootNode;
    if (!prefixNode) return new Set();
    const usableLetters = new Set<Letter>();
    for (const [letter, childNode] of prefixNode.children) {
      if (!suffix) {
        usableLetters.add(letter);
        continue;
      }
      const suffixNode = this.dictionary.getNodeFor(suffix, childNode);
      if (suffixNode && suffixNode.isFinal) usableLetters.add(letter);
    }
    return usableLetters;
  }

  private getPrefix(axisCells: ReadonlyArray<CellIndex>, cellAxisPosition: number): string {
    let prefix = '';
    for (let i = cellAxisPosition - 1; i >= 0; i--) {
      const tile = this.turnManager.findTileByCell(axisCells[i]);
      if (!tile) break;
      prefix = this.inventory.getTileLetter(tile) + prefix;
    }
    return prefix;
  }

  private getSuffix(axisCells: ReadonlyArray<CellIndex>, cellAxisPosition: number): string {
    let suffix = '';
    for (let i = cellAxisPosition + 1; i < axisCells.length; i++) {
      const tile = this.turnManager.findTileByCell(axisCells[i]);
      if (!tile) break;
      suffix += this.inventory.getTileLetter(tile);
    }
    return suffix;
  }
}
