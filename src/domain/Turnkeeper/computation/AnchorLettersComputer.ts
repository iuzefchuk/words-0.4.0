import { GameContext } from '@/domain/types.ts';
import { Letter } from '@/domain/enums.js';
import { Dictionary } from '@/domain/Dictionary/types/shared.ts';
import { Inventory } from '@/domain/Inventory/types/shared.ts';
import { AnchorCoordinates, CellIndex, Layout } from '@/domain/Layout/types/shared.ts';
import { Turnkeeper } from '@/domain/Turnkeeper/types/shared.ts';

export default class AnchorLettersComputer {
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

  execute(coords: AnchorCoordinates): ReadonlySet<Letter> {
    const axisCells = this.layout.getAxisCells(coords);
    const cellAxisPosition = axisCells.indexOf(coords.index);
    const prefix = this.getPrefix(axisCells, cellAxisPosition);
    const suffix = this.getSuffix(axisCells, cellAxisPosition);
    if (!prefix && !suffix) return this.dictionary.allLetters;
    const prefixEntry = prefix ? this.dictionary.findEntryForWord({ word: prefix }) : this.dictionary.firstEntry;
    if (!prefixEntry) return new Set();
    const anchorLetters = new Set<Letter>();
    const generator = this.dictionary.createNextEntryGenerator({ startEntry: prefixEntry });
    for (const [possibleNextLetter, entryWithPossibleNextLetter] of generator) {
      if (!suffix) {
        anchorLetters.add(possibleNextLetter);
        continue;
      }
      const suffixEntry = this.dictionary.findEntryForWord({ word: suffix, startEntry: entryWithPossibleNextLetter });
      if (suffixEntry && this.dictionary.isEntryPlayable(suffixEntry)) anchorLetters.add(possibleNextLetter);
    }
    return anchorLetters;
  }

  private getPrefix(axisCells: ReadonlyArray<CellIndex>, cellAxisPosition: number): string {
    let prefix = '';
    for (let i = cellAxisPosition - 1; i >= 0; i--) {
      const tile = this.turnkeeper.findTileByCell(axisCells[i]);
      if (!tile) break;
      prefix = this.inventory.getTileLetter(tile) + prefix;
    }
    return prefix;
  }

  private getSuffix(axisCells: ReadonlyArray<CellIndex>, cellAxisPosition: number): string {
    let suffix = '';
    for (let i = cellAxisPosition + 1; i < axisCells.length; i++) {
      const tile = this.turnkeeper.findTileByCell(axisCells[i]);
      if (!tile) break;
      suffix += this.inventory.getTileLetter(tile);
    }
    return suffix;
  }
}
