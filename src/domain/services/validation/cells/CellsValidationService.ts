import { GameValidationError } from '@/domain/enums.ts';
import { GameCell, GamePlacement, GameTile } from '@/domain/types/index.ts';

export default class CellsValidationService {
  static execute(
    tiles: ReadonlyArray<GameTile>,
    historyHasPriorTurns: boolean,
    resolvePlacement: (tiles: ReadonlyArray<GameTile>) => GamePlacement,
    isCellCenter: (cell: GameCell) => boolean,
    getAdjacentCells: (cell: GameCell) => ReadonlyArray<GameCell>,
    isCellOccupied: (cell: GameCell) => boolean,
  ): GameValidationError | ReadonlyArray<GameCell> {
    if (tiles.length === 0) return GameValidationError.InvalidTilePlacement;
    const placement = resolvePlacement(tiles);
    const cells = placement.map(link => link.cell);
    const placementCells = new Set(cells);
    const someCellsAreAnchor = cells.some(cell => {
      if (isCellCenter(cell)) return true;
      if (!historyHasPriorTurns) return false;
      return getAdjacentCells(cell).some(adj => isCellOccupied(adj) && !placementCells.has(adj));
    });
    return someCellsAreAnchor ? cells : GameValidationError.NoCellsUsableAsFirst;
  }
}
