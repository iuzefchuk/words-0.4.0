import { Axis } from '@/domain/models/board/enums.ts';
import { AnchorCoordinates, Cell, Placement } from '@/domain/models/board/types.ts';
import { Tile } from '@/domain/models/inventory/types.ts';
import { ValidationError } from '@/domain/models/turns/enums.ts';

export default class PlacementsValidationService {
  static execute(
    tiles: ReadonlyArray<Tile>,
    cells: ReadonlyArray<Cell>,
    calculateAxis: (cells: ReadonlyArray<Cell>) => Axis,
    createPlacement: (coords: AnchorCoordinates, tiles: ReadonlyArray<Tile>) => Placement,
    getOppositeAxis: (axis: Axis) => Axis,
    findTileByCell: (cell: Cell) => Tile | undefined,
  ): ReadonlyArray<Placement> | ValidationError {
    const primaryAxis = calculateAxis(cells);
    const cell = cells[0];
    if (cell === undefined) throw new ReferenceError('expected first cell, got undefined');
    const coords = { axis: primaryAxis, cell };
    const primaryPlacement = createPlacement(coords, tiles);
    const areLinksUsable = (placement: Placement): boolean => placement.length > 1;
    if (!areLinksUsable(primaryPlacement)) return ValidationError.InvalidTilePlacement;
    const result: Array<Placement> = [primaryPlacement];
    for (const cell of cells) {
      const coords: AnchorCoordinates = { axis: getOppositeAxis(primaryAxis), cell };
      const tile = findTileByCell(cell);
      if (tile === undefined) continue;
      const secondaryPlacement = createPlacement(coords, [tile]);
      if (areLinksUsable(secondaryPlacement)) result.push(secondaryPlacement);
    }
    return result;
  }
}
