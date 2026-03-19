import { describe, it, expect } from 'vitest';
import TurnTracker, { ValidationStatus } from '@/domain/models/TurnTracker.ts';
import { Player } from '@/domain/enums.ts';
import { TestIdGenerator, cellIndex, tileId } from '$/helpers.ts';

describe('TurnTracker', () => {
  function createHistory() {
    return TurnTracker.create({ idGenerator: new TestIdGenerator() });
  }

  it('nextPlayer starts with User', () => {
    const history = createHistory();
    expect(history.nextPlayer).toBe(Player.User);
  });

  it('createNewTurnFor alternates players', () => {
    const history = createHistory();
    history.createNewTurnFor(Player.User);
    expect(history.currentPlayer).toBe(Player.User);
    expect(history.nextPlayer).toBe(Player.Opponent);

    history.createNewTurnFor(Player.Opponent);
    expect(history.currentPlayer).toBe(Player.Opponent);
    expect(history.nextPlayer).toBe(Player.User);
  });

  it('throws when creating turn for wrong player', () => {
    const history = createHistory();
    expect(() => history.createNewTurnFor(Player.Opponent)).toThrow('Expected next player');
  });

  describe('placement tracking', () => {
    it('tracks placed tiles in current turn', () => {
      const history = createHistory();
      history.createNewTurnFor(Player.User);

      history.placeTileInCurrentTurn(tileId('t1'));
      const tiles = history.currentTurnTiles;
      expect(tiles).toHaveLength(1);
      expect(tiles[0]).toBe(tileId('t1'));
    });

    it('undoes a placed tile', () => {
      const history = createHistory();
      history.createNewTurnFor(Player.User);

      history.placeTileInCurrentTurn(tileId('t1'));
      history.undoPlaceTileInCurrentTurn({ tile: tileId('t1') });
      expect(history.currentTurnTiles).toHaveLength(0);
    });

    it('tracks multiple tiles in placement order', () => {
      const history = createHistory();
      history.createNewTurnFor(Player.User);

      history.placeTileInCurrentTurn(tileId('t2'));
      history.placeTileInCurrentTurn(tileId('t1'));
      const tiles = history.currentTurnTiles;
      expect(tiles[0]).toBe(tileId('t2'));
      expect(tiles[1]).toBe(tileId('t1'));
    });
  });

  describe('resetCurrentTurn', () => {
    it('clears placement and validation', () => {
      const history = createHistory();
      history.createNewTurnFor(Player.User);
      history.placeTileInCurrentTurn(tileId('t1'));
      history.resetCurrentTurn();

      expect(history.currentTurnTiles).toHaveLength(0);
      expect(history.currentTurnIsValid).toBe(false);
    });
  });

  describe('validation state', () => {
    it('starts unvalidated', () => {
      const history = createHistory();
      history.createNewTurnFor(Player.User);
      expect(history.currentTurnIsValid).toBe(false);
      expect(history.currentTurnError).toBeUndefined();
      expect(history.currentTurnScore).toBeUndefined();
    });

    it('tracks valid result', () => {
      const history = createHistory();
      history.createNewTurnFor(Player.User);
      history.setCurrentTurnValidation({
        status: ValidationStatus.Valid,
        cells: [cellIndex(112)],
        placements: [[{ cell: cellIndex(112), tile: tileId('t1') }]],
        words: ['CAT'],
        score: 5,
      });

      expect(history.currentTurnIsValid).toBe(true);
      expect(history.currentTurnScore).toBe(5);
      expect(history.currentTurnWords).toEqual(['CAT']);
    });
  });

  describe('hasOpponentTurns', () => {
    it('returns false with only one turn', () => {
      const history = createHistory();
      history.createNewTurnFor(Player.User);
      expect(history.hasOpponentTurns).toBe(false);
    });

    it('returns true with two turns', () => {
      const history = createHistory();
      history.createNewTurnFor(Player.User);
      history.createNewTurnFor(Player.Opponent);
      expect(history.hasOpponentTurns).toBe(true);
    });
  });
});
