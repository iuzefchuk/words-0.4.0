import { describe, it, expect } from 'vitest';
import TurnTracker, { ValidationStatus } from '@/domain/models/TurnTracker.ts';
import { Player } from '@/domain/enums.ts';
import { TestIdGenerator, cellIndex, tileId } from '$/helpers.ts';

describe('TurnTracker', () => {
  function createTracker() {
    return TurnTracker.create({ idGenerator: new TestIdGenerator() });
  }

  it('nextPlayer starts with User', () => {
    const tracker = createTracker();
    expect(tracker.nextPlayer).toBe(Player.User);
  });

  it('createNewTurnFor alternates players', () => {
    const tracker = createTracker();
    tracker.createNewTurnFor(Player.User);
    expect(tracker.currentPlayer).toBe(Player.User);
    expect(tracker.nextPlayer).toBe(Player.Opponent);

    tracker.createNewTurnFor(Player.Opponent);
    expect(tracker.currentPlayer).toBe(Player.Opponent);
    expect(tracker.nextPlayer).toBe(Player.User);
  });

  it('throws when creating turn for wrong player', () => {
    const tracker = createTracker();
    expect(() => tracker.createNewTurnFor(Player.Opponent)).toThrow('Expected next player');
  });

  describe('placement tracking', () => {
    it('tracks placed tiles in current turn', () => {
      const tracker = createTracker();
      tracker.createNewTurnFor(Player.User);

      tracker.placeTileInCurrentTurn(tileId('t1'));
      const tiles = tracker.currentTurnTiles;
      expect(tiles).toHaveLength(1);
      expect(tiles[0]).toBe(tileId('t1'));
    });

    it('undoes a placed tile', () => {
      const tracker = createTracker();
      tracker.createNewTurnFor(Player.User);

      tracker.placeTileInCurrentTurn(tileId('t1'));
      tracker.undoPlaceTileInCurrentTurn({ tile: tileId('t1') });
      expect(tracker.currentTurnTiles).toHaveLength(0);
    });

    it('tracks multiple tiles in placement order', () => {
      const tracker = createTracker();
      tracker.createNewTurnFor(Player.User);

      tracker.placeTileInCurrentTurn(tileId('t2'));
      tracker.placeTileInCurrentTurn(tileId('t1'));
      const tiles = tracker.currentTurnTiles;
      expect(tiles[0]).toBe(tileId('t2'));
      expect(tiles[1]).toBe(tileId('t1'));
    });
  });

  describe('resetCurrentTurn', () => {
    it('clears placement and validation', () => {
      const tracker = createTracker();
      tracker.createNewTurnFor(Player.User);
      tracker.placeTileInCurrentTurn(tileId('t1'));
      tracker.resetCurrentTurn();

      expect(tracker.currentTurnTiles).toHaveLength(0);
      expect(tracker.currentTurnIsValid).toBe(false);
    });
  });

  describe('validation state', () => {
    it('starts unvalidated', () => {
      const tracker = createTracker();
      tracker.createNewTurnFor(Player.User);
      expect(tracker.currentTurnIsValid).toBe(false);
      expect(tracker.currentTurnError).toBeUndefined();
      expect(tracker.currentTurnScore).toBeUndefined();
    });

    it('tracks valid result', () => {
      const tracker = createTracker();
      tracker.createNewTurnFor(Player.User);
      tracker.setCurrentTurnValidation({
        status: ValidationStatus.Valid,
        cells: [cellIndex(112)],
        placements: [[{ cell: cellIndex(112), tile: tileId('t1') }]],
        words: ['CAT'],
        score: 5,
      });

      expect(tracker.currentTurnIsValid).toBe(true);
      expect(tracker.currentTurnScore).toBe(5);
      expect(tracker.currentTurnWords).toEqual(['CAT']);
    });
  });

  describe('hasPriorTurns', () => {
    it('returns false with only one turn', () => {
      const tracker = createTracker();
      tracker.createNewTurnFor(Player.User);
      expect(tracker.hasPriorTurns).toBe(false);
    });

    it('returns true with two turns', () => {
      const tracker = createTracker();
      tracker.createNewTurnFor(Player.User);
      tracker.createNewTurnFor(Player.Opponent);
      expect(tracker.hasPriorTurns).toBe(true);
    });
  });
});
