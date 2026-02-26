import { TileId } from '../Inventory/Inventory.js';
import { Layout, Axis, CellIndex } from '../Layout/Layout.js';
import { TurnManager, Placement } from './Turn.js';

// TODO optimize
export class TurnPlacementFactory {
  constructor(
    private readonly layout: Layout,
    private readonly turnManager: TurnManager,
  ) {}

  create({
    axis,
    targetCell,
    tileSequence,
  }: {
    axis: Axis;
    targetCell: CellIndex;
    tileSequence: ReadonlyArray<TileId>;
  }): Placement {
    const axisCells = this.layout.getAxisCells({ axis, targetCell });
    if (tileSequence.length === 0) return [];
    const tileSet = new Set(tileSequence);
    const placement: Placement = [];
    let segmentHasTurnTile = false;
    let matchedTurnTiles = 0;
    for (const cell of axisCells) {
      const tile = this.turnManager.findTileByCell(cell);
      if (!tile) {
        if (placement.length === 0) continue;
        if (segmentHasTurnTile) break;
        placement.length = 0;
        segmentHasTurnTile = false;
        matchedTurnTiles = 0;
        continue;
      }
      placement.push({ cell, tile });
      if (tileSet.has(tile)) {
        segmentHasTurnTile = true;
        matchedTurnTiles++;
      }
    }
    const allUsed = matchedTurnTiles === tileSequence.length;
    return segmentHasTurnTile && allUsed ? placement : [];
  }
}
