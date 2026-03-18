import { describe, it, expect } from 'vitest';
import PlaceTile from '@/application/commands/PlaceTile.ts';
import { createTestContext, cellIndex } from '$/helpers.ts';
import { Player } from '@/domain/enums.ts';

describe('PlaceTile', () => {
  it('places a tile and runs validation', () => {
    const context = createTestContext();
    const userTiles = context.inventory.getTilesFor(Player.User);
    const tile = userTiles[0];

    PlaceTile.execute(context, { cell: cellIndex(112), tile });

    expect(context.board.isTilePlaced(tile)).toBe(true);
    expect(context.turnDirector.currentTurnPlacementLinks).toHaveLength(1);
    // Validation should have run (score or error should be set)
    const hasValidation =
      context.turnDirector.currentTurnError !== undefined || context.turnDirector.currentTurnScore !== undefined;
    expect(hasValidation).toBe(true);
  });

  it('places multiple tiles and validates', () => {
    const context = createTestContext();
    const userTiles = context.inventory.getTilesFor(Player.User);

    PlaceTile.execute(context, { cell: cellIndex(112), tile: userTiles[0] });
    PlaceTile.execute(context, { cell: cellIndex(113), tile: userTiles[1] });

    expect(context.turnDirector.currentTurnPlacementLinks).toHaveLength(2);
  });
});
