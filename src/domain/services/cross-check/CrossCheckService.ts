import { Letter } from '@/domain/enums.ts';
import Board from '@/domain/models/board/Board.ts';
import { Axis } from '@/domain/models/board/enums.ts';
import { AnchorCoordinates, Cell } from '@/domain/models/board/types.ts';
import Dictionary from '@/domain/models/dictionary/Dictionary.ts';
import Inventory from '@/domain/models/inventory/Inventory.ts';

export default class CrossCheckService {
  private readonly cache = new Map<Axis, Map<Cell, ReadonlySet<Letter>>>(Object.values(Axis).map(axis => [axis, new Map()]));

  constructor(
    private readonly board: Board,
    private readonly dictionary: Dictionary,
    private readonly inventory: Inventory,
  ) {}

  execute(coords: AnchorCoordinates): ReadonlySet<Letter> {
    const { axis, cell } = coords;
    const axisCache = this.cache.get(axis);
    if (axisCache === undefined) throw new ReferenceError(`expected axis cache for axis ${axis}, got undefined`);
    const cachedResult = axisCache.get(cell);
    if (cachedResult !== undefined) return cachedResult;
    const newResult = this.computeFor(coords);
    axisCache.set(cell, newResult);
    return newResult;
  }

  private collectAdjacentTileLetters(axisCells: ReadonlyArray<Cell>, startPosition: number, direction: -1 | 1): string {
    let result = '';
    for (let idx = startPosition + direction; idx >= 0 && idx < axisCells.length; idx += direction) {
      const cell = axisCells[idx];
      if (cell === undefined) throw new ReferenceError(`expected cell at index ${String(idx)}, got undefined`);
      const tile = this.board.findTileByCell(cell);
      if (tile === undefined) break;
      const letter = this.inventory.getTileLetter(tile);
      result = direction === -1 ? letter + result : result + letter;
    }
    return result;
  }

  private computeFor(coords: AnchorCoordinates): ReadonlySet<Letter> {
    const axisCells = this.board.getAxisCells(coords);
    const position =
      coords.axis === Axis.X ? this.board.getCellPositionInColumn(coords.cell) : this.board.getCellPositionInRow(coords.cell);
    const prefix = this.collectAdjacentTileLetters(axisCells, position, -1);
    const suffix = this.collectAdjacentTileLetters(axisCells, position, 1);
    if (prefix === '' && suffix === '') return new Set(Object.values(Letter));
    const prefixNode = prefix !== '' ? this.dictionary.getNode(prefix) : this.dictionary.rootNode;
    if (prefixNode === null) return new Set();
    const anchorLetters = new Set<Letter>();
    this.dictionary.forEachNodeChild(prefixNode, (possibleNextLetter, nodeWithPossibleNextLetter) => {
      if (suffix === '') {
        anchorLetters.add(possibleNextLetter);
        return;
      }
      const suffixNode = this.dictionary.getNode(suffix, nodeWithPossibleNextLetter);
      if (suffixNode !== null && this.dictionary.isNodeFinal(suffixNode)) anchorLetters.add(possibleNextLetter);
    });
    return anchorLetters;
  }
}
