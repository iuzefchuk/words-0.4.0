import { describe, it, expect } from 'vitest';
import SaveTurn from '@/application/commands/SaveTurn.ts';
import { createTestContext, cellIndex } from '$/helpers.ts';
import { Player } from '@/domain/enums.ts';
import { ValidationStatus, ValidationError } from '@/domain/models/TurnTracker.ts';

describe('SaveTurn', () => {
  it('returns error when turn has validation error', () => {
    const context = createTestContext();
    // Set an invalid validation result
    context.turnDirector.setCurrentTurnValidation({
      status: ValidationStatus.Invalid,
      error: ValidationError.InvalidTilePlacement,
    });

    const result = SaveTurn.execute(context);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(ValidationError.InvalidTilePlacement);
    }
  });

  it('saves a valid turn and returns words', () => {
    const context = createTestContext();
    const userTiles = context.inventory.getTilesFor(Player.User);
    const tile = userTiles[0];

    context.turnDirector.placeTile({ cell: cellIndex(112), tile });
    context.turnDirector.setCurrentTurnValidation({
      status: ValidationStatus.Valid,
      cells: [cellIndex(112)],
      placements: [[{ cell: cellIndex(112), tile }]],
      words: ['A'],
      score: 1,
    });

    const result = SaveTurn.execute(context);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.words).toEqual(['A']);
    }
  });

  it('discards tiles and replenishes after saving', () => {
    const context = createTestContext();
    const userTiles = context.inventory.getTilesFor(Player.User);
    const tile = userTiles[0];

    context.turnDirector.placeTile({ cell: cellIndex(112), tile });
    context.turnDirector.setCurrentTurnValidation({
      status: ValidationStatus.Valid,
      cells: [cellIndex(112)],
      placements: [[{ cell: cellIndex(112), tile }]],
      words: ['A'],
      score: 1,
    });

    const unusedBefore = context.inventory.unusedTilesCount;
    SaveTurn.execute(context);
    // One tile discarded, one drawn: net change = 0 if pool has tiles
    expect(context.inventory.unusedTilesCount).toBe(unusedBefore - 1);
    // Player should still have 7 tiles (replenished)
    expect(context.inventory.getTilesFor(Player.User)).toHaveLength(7);
  });

  it('advances to next player after saving', () => {
    const context = createTestContext();
    const userTiles = context.inventory.getTilesFor(Player.User);
    const tile = userTiles[0];

    context.turnDirector.placeTile({ cell: cellIndex(112), tile });
    context.turnDirector.setCurrentTurnValidation({
      status: ValidationStatus.Valid,
      cells: [cellIndex(112)],
      placements: [[{ cell: cellIndex(112), tile }]],
      words: ['A'],
      score: 1,
    });

    SaveTurn.execute(context);
    expect(context.turnDirector.currentPlayer).toBe(Player.Opponent);
  });
});
