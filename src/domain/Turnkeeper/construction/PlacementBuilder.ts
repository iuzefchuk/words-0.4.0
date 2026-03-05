import { TileId } from '@/domain/Inventory/types/shared.ts';
import { Layout, AnchorCoordinates } from '@/domain/Layout/types/shared.ts';
import { Turnkeeper, Placement } from '@/domain/Turnkeeper/types/shared.ts';

export default class PlacementBuilder {
  constructor(
    private readonly layout: Layout,
    private readonly turnkeeper: Turnkeeper,
  ) {}

  execute({ coords, tileSequence }: { coords: AnchorCoordinates; tileSequence: ReadonlyArray<TileId> }): Placement {
    if (tileSequence.length === 0) throw new Error('Tile sequence can`t be empty');
    const axisCells = this.layout.getAxisCells(coords);
    const tileSet = new Set(tileSequence);
    const placement: Placement = [];
    let segmentHasTile = false;
    let usedTilesCount = 0;
    for (const cell of axisCells) {
      const tile = this.turnkeeper.findTileByCell(cell);
      if (!tile) {
        if (placement.length === 0) continue;
        if (segmentHasTile) break;
        placement.length = 0;
        segmentHasTile = false;
        usedTilesCount = 0;
      } else {
        placement.push({ cell, tile });
        if (tileSet.has(tile)) {
          segmentHasTile = true;
          usedTilesCount++;
        }
      }
    }
    const allTilesWereUsed = usedTilesCount === tileSequence.length;
    return segmentHasTile && allTilesWereUsed ? placement : [];
  }
}
