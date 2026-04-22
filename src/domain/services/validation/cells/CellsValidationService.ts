import { Cell, Placement } from '@/domain/models/board/types.ts';
import { Tile } from '@/domain/models/inventory/types.ts';
import { ValidationError } from '@/domain/models/turns/enums.ts';

export default class CellsValidationService {
  static execute(
    tiles: ReadonlyArray<Tile>,
    historyHasPriorTurns: boolean,
    resolvePlacement: (tiles: ReadonlyArray<Tile>) => Placement,
    isCellCenter: (cell: Cell) => boolean,
    getAdjacentCells: (cell: Cell) => ReadonlyArray<Cell>,
    isCellOccupied: (cell: Cell) => boolean,
  ): ReadonlyArray<Cell> | ValidationError {
    if (tiles.length === 0) return ValidationError.InvalidTilePlacement;
    const placement = resolvePlacement(tiles);
    const cells = placement.map(link => link.cell);
    const placementCells = new Set(cells);
    const someCellsAreAnchor = cells.some(cell => {
      if (isCellCenter(cell)) return true;
      if (!historyHasPriorTurns) return false;
      return getAdjacentCells(cell).some(adj => isCellOccupied(adj) && !placementCells.has(adj));
    });
    return someCellsAreAnchor ? cells : ValidationError.NoCellsUsableAsFirst;
  }
}
