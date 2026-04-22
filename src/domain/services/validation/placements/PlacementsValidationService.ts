import { GameAxis, GameValidationError } from '@/domain/enums.ts';
import { GameAnchorCoordinates, GameCell, GamePlacement, GameTile } from '@/domain/types/index.ts';

export default class PlacementsValidationService {
  static execute(
    tiles: ReadonlyArray<GameTile>,
    cells: ReadonlyArray<GameCell>,
    calculateAxis: (cells: ReadonlyArray<GameCell>) => GameAxis,
    createPlacement: (coords: GameAnchorCoordinates, tiles: ReadonlyArray<GameTile>) => GamePlacement,
    getOppositeAxis: (axis: GameAxis) => GameAxis,
    findTileByCell: (cell: GameCell) => GameTile | undefined,
  ): GameValidationError | ReadonlyArray<GamePlacement> {
    const primaryAxis = calculateAxis(cells);
    const cell = cells[0];
    if (cell === undefined) throw new ReferenceError('expected first cell, got undefined');
    const coords = { axis: primaryAxis, cell };
    const primaryPlacement = createPlacement(coords, tiles);
    const areLinksUsable = (placement: GamePlacement): boolean => placement.length > 1;
    if (!areLinksUsable(primaryPlacement)) return GameValidationError.InvalidTilePlacement;
    const result: Array<GamePlacement> = [primaryPlacement];
    for (const cell of cells) {
      const coords: GameAnchorCoordinates = { axis: getOppositeAxis(primaryAxis), cell };
      const tile = findTileByCell(cell);
      if (tile === undefined) continue;
      const secondaryPlacement = createPlacement(coords, [tile]);
      if (areLinksUsable(secondaryPlacement)) result.push(secondaryPlacement);
    }
    return result;
  }
}
