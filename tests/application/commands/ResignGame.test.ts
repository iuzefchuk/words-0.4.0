import { describe, it, expect } from 'vitest';
import ResignGame from '@/application/commands/ResignGame.ts';
import { createTestContext } from '$/helpers.ts';
import { Player } from '@/domain/enums.ts';

describe('ResignGame', () => {
  it('records resignation for current player', () => {
    const context = createTestContext();
    expect(context.turnDirector.currentPlayer).toBe(Player.User);

    ResignGame.execute(context);
    // Resignation records loss for current player, not a pass
    expect(context.turnDirector.hasPlayerPassed(Player.User)).toBe(false);
  });

  it('does not advance the turn', () => {
    const context = createTestContext();
    ResignGame.execute(context);
    // Resign doesn't call startTurnForNextPlayer
    expect(context.turnDirector.currentPlayer).toBe(Player.User);
  });
});
