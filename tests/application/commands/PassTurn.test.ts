import { describe, it, expect } from 'vitest';
import PassTurn from '@/application/commands/PassTurn.ts';
import { createTestContext } from '$/helpers.ts';
import { Player } from '@/domain/index.ts';

describe('PassTurn', () => {
  it('advances to next player', () => {
    const context = createTestContext();
    expect(context.game.currentPlayer).toBe(Player.User);

    PassTurn.execute(context);
    expect(context.game.currentPlayer).toBe(Player.Opponent);
  });

  it('records the pass', () => {
    const context = createTestContext();
    PassTurn.execute(context);
    expect(context.game.willPlayerPassBeResign(Player.User)).toBe(true);
  });

  it('allows consecutive passes by different players', () => {
    const context = createTestContext();
    PassTurn.execute(context); // User passes
    PassTurn.execute(context); // Opponent passes
    expect(context.game.currentPlayer).toBe(Player.User);
    expect(context.game.willPlayerPassBeResign(Player.Opponent)).toBe(true);
  });
});
