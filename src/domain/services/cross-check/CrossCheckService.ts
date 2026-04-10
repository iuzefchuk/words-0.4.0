import { Letter } from '@/domain/enums.ts';
import Board from '@/domain/models/board/Board.ts';
import { Axis } from '@/domain/models/board/enums.ts';
import { AnchorCoordinates, Cell } from '@/domain/models/board/types.ts';
import Dictionary from '@/domain/models/dictionary/Dictionary.ts';
import Inventory from '@/domain/models/inventory/Inventory.ts';

export default class CrossCheckService {
  private cache = new Map<Axis, Map<Cell, ReadonlySet<Letter>>>(Object.values(Axis).map(axis => [axis, new Map()]));

  constructor(
    private readonly board: Board,
    private readonly dictionary: Dictionary,
    private readonly inventory: Inventory,
  ) {}

  execute(coords: AnchorCoordinates): ReadonlySet<Letter> {
    const { axis, cell } = coords;
    const axisCache = this.cache.get(axis);
    if (axisCache === undefined) throw new ReferenceError('Axis cache has to exist');
    const cachedResult = axisCache.get(cell);
    if (cachedResult) return cachedResult;
    const newResult = this.computeFor(coords);
    axisCache.set(cell, newResult);
    return newResult;
  }

  private collectAdjacentTileLetters(axisCells: ReadonlyArray<Cell>, startPosition: number, direction: -1 | 1): string {
    let result = '';
    for (let i = startPosition + direction; i >= 0 && i < axisCells.length; i += direction) {
      const cell = axisCells[i];
      if (cell === undefined) throw new ReferenceError('Cell must be defined');
      const tile = this.board.findTileByCell(cell);
      if (!tile) break;
      const letter = this.inventory.getTileLetter(tile);
      result = direction === -1 ? letter + result : result + letter;
    }
    return result;
  }

  private computeFor(coords: AnchorCoordinates): ReadonlySet<Letter> {
    const axisCells = this.board.calculateAxisCells(coords);
    const position = axisCells.indexOf(coords.cell);
    if (position === -1) throw new Error('Cell not found in axis cells');
    const prefix = this.collectAdjacentTileLetters(axisCells, position, -1);
    const suffix = this.collectAdjacentTileLetters(axisCells, position, 1);
    if (!prefix && !suffix) return new Set(Object.values(Letter));
    const prefixNode = prefix ? this.dictionary.getNode(prefix) : this.dictionary.rootNode;
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
}
