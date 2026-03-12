import { Placement } from '@/domain/types.ts';
import { Link } from '@/domain/model/Placement.ts';
import { TileId } from '@/domain/model/Inventory/types.ts';
import { AnchorCoordinates } from '@/domain/reference/Layout/types.ts';
import { Board } from '@/domain/model/Board/types.ts';

export default class PlacementBuilder {
  static execute(
    board: Board,
    args: { coords: AnchorCoordinates; tileSequence: ReadonlyArray<TileId> },
  ): Placement {
    const { coords, tileSequence } = args;
    if (tileSequence.length === 0) throw new Error('Tile sequence can`t be empty');
    const axisCells = board.getAxisCells(coords);
    const tilesToPlace = new Set(tileSequence);
    let links: Array<Link> = [];
    let segmentContainsTile = false;
    let matchedTilesCount = 0;
    for (const cell of axisCells) {
      const tile = board.findTileByCell(cell);
      if (!tile) {
        if (links.length === 0) continue;
        if (segmentContainsTile) break;
        links = [];
        segmentContainsTile = false;
        matchedTilesCount = 0;
        continue;
      }
      links.push({ cell, tile });
      if (tilesToPlace.has(tile)) {
        segmentContainsTile = true;
        matchedTilesCount++;
      }
    }
    const isValid = segmentContainsTile && matchedTilesCount === tileSequence.length;
    return isValid ? Placement.from(links) : Placement.create();
  }
}
