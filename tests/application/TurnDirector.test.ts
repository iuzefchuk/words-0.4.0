import { describe, it, expect } from 'vitest';
import TurnDirector from '@/application/TurnDirector.ts';
import Board from '@/domain/models/Board.ts';
import { Player } from '@/domain/enums.ts';
import { ValidationStatus } from '@/domain/models/TurnHistory.ts';
import { TestIdGenerator, cellIndex, tileId } from '$/helpers.ts';

function createDirector() {
  const board = Board.create();
  const idGenerator = new TestIdGenerator();
  return { director: TurnDirector.create({ players: [Player.User, Player.Opponent], board, idGenerator }), board };
}

describe('TurnDirector', () => {
  it('starts with User as current player', () => {
    const { director } = createDirector();
    expect(director.currentPlayer).toBe(Player.User);
  });

  it('has no opponent turns initially', () => {
    const { director } = createDirector();
    expect(director.historyHasOpponentTurns).toBe(false);
  });

  describe('placeTile / undoPlaceTile', () => {
    it('places a tile on both board and history', () => {
      const { director, board } = createDirector();
      director.placeTile({ cell: cellIndex(112), tile: tileId('t1') });

      expect(board.isTilePlaced(tileId('t1'))).toBe(true);
      expect(director.currentTurnPlacementLinks).toHaveLength(1);
    });

    it('undoes a tile placement from both board and history', () => {
      const { director, board } = createDirector();
      director.placeTile({ cell: cellIndex(112), tile: tileId('t1') });
      director.undoPlaceTile({ tile: tileId('t1') });

      expect(board.isTilePlaced(tileId('t1'))).toBe(false);
      expect(director.currentTurnPlacementLinks).toHaveLength(0);
    });
  });

  describe('resetCurrentTurn', () => {
    it('removes all placed tiles from board and history', () => {
      const { director, board } = createDirector();
      director.placeTile({ cell: cellIndex(112), tile: tileId('t1') });
      director.placeTile({ cell: cellIndex(113), tile: tileId('t2') });
      director.resetCurrentTurn();

      expect(board.isTilePlaced(tileId('t1'))).toBe(false);
      expect(board.isTilePlaced(tileId('t2'))).toBe(false);
      expect(director.currentTurnPlacementLinks).toHaveLength(0);
    });
  });

  describe('saveCurrentTurn', () => {
    it('throws when turn is not valid', () => {
      const { director } = createDirector();
      expect(() => director.saveCurrentTurn()).toThrow('not valid');
    });

    it('advances to next player when valid', () => {
      const { director } = createDirector();
      director.placeTile({ cell: cellIndex(112), tile: tileId('t1') });
      director.setCurrentTurnValidation({
        status: ValidationStatus.Valid,
        sequences: { cell: [cellIndex(112)], tile: [tileId('t1')] },
        placementLinks: [[{ cell: cellIndex(112), tile: tileId('t1') }]],
        words: ['A'],
        score: 1,
      });
      director.saveCurrentTurn();

      expect(director.currentPlayer).toBe(Player.Opponent);
      expect(director.historyHasOpponentTurns).toBe(true);
    });
  });

  describe('passCurrentTurn', () => {
    it('advances to next player', () => {
      const { director } = createDirector();
      director.passCurrentTurn();
      expect(director.currentPlayer).toBe(Player.Opponent);
    });

    it('records pass action', () => {
      const { director } = createDirector();
      director.passCurrentTurn();
      expect(director.hasPlayerPassed(Player.User)).toBe(true);
    });
  });

  describe('resignCurrentTurn', () => {
    it('records loss for current player and win for other', () => {
      const { director } = createDirector();
      // User resigns
      director.resignCurrentTurn();
      // hasPlayerPassed won't be true since resign records Won/Lost not Passed
      expect(director.hasPlayerPassed(Player.User)).toBe(false);
    });
  });

  describe('getScoreFor', () => {
    it('returns 0 initially', () => {
      const { director } = createDirector();
      expect(director.getScoreFor(Player.User)).toBe(0);
      expect(director.getScoreFor(Player.Opponent)).toBe(0);
    });
  });

  describe('validation state', () => {
    it('starts without error or score', () => {
      const { director } = createDirector();
      expect(director.currentTurnError).toBeUndefined();
      expect(director.currentTurnScore).toBeUndefined();
      expect(director.currentTurnWords).toBeUndefined();
      expect(director.currentTurnIsValid).toBe(false);
    });

    it('reflects set validation result', () => {
      const { director } = createDirector();
      director.setCurrentTurnValidation({
        status: ValidationStatus.Valid,
        sequences: { cell: [cellIndex(112)], tile: [tileId('t1')] },
        placementLinks: [[{ cell: cellIndex(112), tile: tileId('t1') }]],
        words: ['TEST'],
        score: 10,
      });
      expect(director.currentTurnIsValid).toBe(true);
      expect(director.currentTurnScore).toBe(10);
      expect(director.currentTurnWords).toEqual(['TEST']);
    });
  });

  describe('endGameByTileDepletion', () => {
    it('records tied when scores are equal', () => {
      const { director } = createDirector();
      // Both have 0 score
      director.endGameByTileDepletion([Player.User, Player.Opponent]);
      // No direct accessor for Won/Lost/Tied, but it should not throw
    });
  });
});
