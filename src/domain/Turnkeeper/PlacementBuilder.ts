import { GameContext } from '@/domain/types.ts';
import { TileId } from '@/domain/Inventory/types.ts';
import { AnchorCoordinates } from '@/domain/Layout/types.ts';
import { Placement } from '@/domain/Turnkeeper/types.ts';

export default class PlacementBuilder {
  static execute(
    context: GameContext,
    args: { coords: AnchorCoordinates; tileSequence: ReadonlyArray<TileId> },
  ): Placement {
    const { layout, turnkeeper } = context;
    const { coords, tileSequence } = args;
    if (tileSequence.length === 0) throw new Error('Tile sequence can`t be empty');
    const axisCells = layout.getAxisCells(coords);
    const tilesToPlace = new Set(tileSequence);
    let placement: Placement = [];
    let segmentContainsTile = false;
    let matchedTilesCount = 0;
    for (const cell of axisCells) {
      const tile = turnkeeper.findTileByCell(cell);
      if (!tile) {
        if (placement.length === 0) continue;
        if (segmentContainsTile) break;
        placement = [];
        segmentContainsTile = false;
        matchedTilesCount = 0;
        continue;
      }
      placement.push({ cell, tile });
      if (tilesToPlace.has(tile)) {
        segmentContainsTile = true;
        matchedTilesCount++;
      }
    }
    const isValid = segmentContainsTile && matchedTilesCount === tileSequence.length;
    return isValid ? placement : [];
  }
}
