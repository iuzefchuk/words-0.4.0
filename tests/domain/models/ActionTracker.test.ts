import { describe, it, expect } from 'vitest';
import ActionTracker, { PlayerAction } from '@/domain/models/ActionTracker.ts';
import { Player } from '@/domain/enums.ts';

describe('ActionTracker', () => {
  it('initializes all players with Joined', () => {
    const tracker = ActionTracker.create([Player.User, Player.Opponent]);
    expect(tracker.hasPlayerPassed(Player.User)).toBe(false);
    expect(tracker.hasPlayerPassed(Player.Opponent)).toBe(false);
  });

  it('records a pass and detects it', () => {
    const tracker = ActionTracker.create([Player.User, Player.Opponent]);
    tracker.record(Player.User, PlayerAction.Passed);
    expect(tracker.hasPlayerPassed(Player.User)).toBe(true);
    expect(tracker.hasPlayerPassed(Player.Opponent)).toBe(false);
  });

  it('overwrites the last action', () => {
    const tracker = ActionTracker.create([Player.User, Player.Opponent]);
    tracker.record(Player.User, PlayerAction.Passed);
    tracker.record(Player.User, PlayerAction.Saved);
    expect(tracker.hasPlayerPassed(Player.User)).toBe(false);
  });
});
