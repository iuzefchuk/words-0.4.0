import { describe, it, expect } from 'vitest';
import GameStateQuery from '@/application/queries/GameState.ts';
import { createTestContext } from '$/helpers.ts';
import { Player } from '@/domain/enums.ts';

describe('GameStateQuery', () => {
  it('returns initial game state', () => {
    const context = createTestContext();
    const state = GameStateQuery.execute(context, true);

    expect(state.isFinished).toBe(false);
    expect(state.currentPlayerIsUser).toBe(true);
    expect(state.userScore).toBe(0);
    expect(state.opponentScore).toBe(0);
    expect(state.userTiles).toHaveLength(7);
    expect(state.tilesRemaining).toBeGreaterThan(0);
    expect(state.userPassWillBeResign).toBe(false);
  });

  it('reflects isFinished when isMutable is false', () => {
    const context = createTestContext();
    const state = GameStateQuery.execute(context, false);
    expect(state.isFinished).toBe(true);
  });

  it('reflects current turn score from turnDirector', () => {
    const context = createTestContext();
    const state = GameStateQuery.execute(context, true);
    // No tiles placed yet — currentTurnScore is undefined
    expect(state.currentTurnScore).toBeUndefined();
  });

  it('reflects player change after turn advance', () => {
    const context = createTestContext();
    context.turnDirector.passCurrentTurn();

    const state = GameStateQuery.execute(context, true);
    expect(state.currentPlayerIsUser).toBe(false);
  });

  it('reflects userPassWillBeResign after user has passed', () => {
    const context = createTestContext();
    context.turnDirector.passCurrentTurn();
    // Opponent's turn — pass opponent too
    context.turnDirector.passCurrentTurn();
    // Back to user — user already passed once
    const state = GameStateQuery.execute(context, true);
    expect(state.userPassWillBeResign).toBe(true);
  });

  it('returns correct tile count', () => {
    const context = createTestContext();
    const state = GameStateQuery.execute(context, true);
    // 7 tiles per player = 14 used, rest unused
    // Total tiles in standard game minus dealt tiles
    expect(state.tilesRemaining).toBe(context.inventory.unusedTilesCount);
    expect(state.userTiles).toEqual(context.inventory.getTilesFor(Player.User));
  });
});
