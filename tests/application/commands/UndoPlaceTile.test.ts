import { describe, it, expect } from 'vitest';
import PlaceTile from '@/application/commands/PlaceTile.ts';
import UndoPlaceTile from '@/application/commands/UndoPlaceTile.ts';
import { createTestContext, cellIndex } from '$/helpers.ts';
import { Player } from '@/domain/enums.ts';

describe('UndoPlaceTile', () => {
  it('removes a placed tile and re-validates', () => {
    const context = createTestContext();
    const userTiles = context.inventory.getTilesFor(Player.User);
    const tile = userTiles[0];

    PlaceTile.execute(context, { cell: cellIndex(112), tile });
    expect(context.board.isTilePlaced(tile)).toBe(true);

    UndoPlaceTile.execute(context, { tile });
    expect(context.board.isTilePlaced(tile)).toBe(false);
    expect(context.turnDirector.currentTurnPlacementLinks).toHaveLength(0);
  });

  it('re-validates after undo', () => {
    const context = createTestContext();
    const userTiles = context.inventory.getTilesFor(Player.User);

    PlaceTile.execute(context, { cell: cellIndex(112), tile: userTiles[0] });
    PlaceTile.execute(context, { cell: cellIndex(113), tile: userTiles[1] });

    UndoPlaceTile.execute(context, { tile: userTiles[1] });
    // Only one tile left, validation re-runs
    expect(context.turnDirector.currentTurnPlacementLinks).toHaveLength(1);
  });
});
