import { describe, it, expect } from 'vitest';
import { createTestContext, cellIndex, tileId } from '$/helpers.ts';
import { Player, ValidationStatus } from '@/domain/index.ts';

describe('Game (domain)', () => {
  it('starts with User as current player', () => {
    const context = createTestContext();
    expect(context.game.currentPlayer).toBe(Player.User);
  });

  it('has no prior turns initially', () => {
    const context = createTestContext();
    expect(context.game.hasPriorTurns).toBe(false);
  });

  describe('placeTile / undoPlaceTile', () => {
    it('places a tile on both board and history', () => {
      const context = createTestContext();
      const userTiles = context.inventory.getTilesFor(Player.User);
      const tile = userTiles[0];
      context.game.placeTile({ cell: cellIndex(112), tile });

      expect(context.board.isTilePlaced(tile)).toBe(true);
      expect(context.game.currentTurnPlacement).toHaveLength(1);
    });

    it('undoes a tile placement from both board and history', () => {
      const context = createTestContext();
      const userTiles = context.inventory.getTilesFor(Player.User);
      const tile = userTiles[0];
      context.game.placeTile({ cell: cellIndex(112), tile });
      context.game.undoPlaceTile({ tile });

      expect(context.board.isTilePlaced(tile)).toBe(false);
      expect(context.game.currentTurnPlacement).toHaveLength(0);
    });
  });

  describe('resetCurrentTurn', () => {
    it('removes all placed tiles from board and history', () => {
      const context = createTestContext();
      const userTiles = context.inventory.getTilesFor(Player.User);
      const tile1 = userTiles[0];
      const tile2 = userTiles[1];
      context.game.placeTile({ cell: cellIndex(112), tile: tile1 });
      context.game.placeTile({ cell: cellIndex(113), tile: tile2 });
      context.game.resetCurrentTurn();

      expect(context.board.isTilePlaced(tile1)).toBe(false);
      expect(context.board.isTilePlaced(tile2)).toBe(false);
      expect(context.game.currentTurnPlacement).toHaveLength(0);
    });
  });

  describe('saveCurrentTurn', () => {
    it('throws when turn is not valid', () => {
      const context = createTestContext();
      expect(() => context.game.saveCurrentTurn()).toThrow('not valid');
    });

    it('advances to next player when valid', () => {
      const context = createTestContext();
      const userTiles = context.inventory.getTilesFor(Player.User);
      const tile = userTiles[0];
      context.game.placeTile({ cell: cellIndex(112), tile });
      context.game.setCurrentTurnValidation({
        status: ValidationStatus.Valid,
        cells: [cellIndex(112)],
        placements: [[{ cell: cellIndex(112), tile }]],
        words: ['A'],
        score: 1,
      });
      context.game.saveCurrentTurn();

      expect(context.game.currentPlayer).toBe(Player.Opponent);
      expect(context.game.hasPriorTurns).toBe(true);
    });
  });

  describe('passCurrentTurn', () => {
    it('advances to next player', () => {
      const context = createTestContext();
      context.game.passCurrentTurn();
      expect(context.game.currentPlayer).toBe(Player.Opponent);
    });

    it('records pass action', () => {
      const context = createTestContext();
      context.game.passCurrentTurn();
      expect(context.game.willPlayerPassBeResign(Player.User)).toBe(true);
    });
  });

  describe('getScoreFor', () => {
    it('returns 0 initially', () => {
      const context = createTestContext();
      expect(context.game.getScoreFor(Player.User)).toBe(0);
      expect(context.game.getScoreFor(Player.Opponent)).toBe(0);
    });
  });

  describe('validation state', () => {
    it('starts without error or score', () => {
      const context = createTestContext();
      expect(context.game.currentTurnError).toBeUndefined();
      expect(context.game.currentTurnScore).toBeUndefined();
      expect(context.game.currentTurnWords).toBeUndefined();
      expect(context.game.currentTurnIsValid).toBe(false);
    });

    it('reflects set validation result', () => {
      const context = createTestContext();
      const userTiles = context.inventory.getTilesFor(Player.User);
      const tile = userTiles[0];
      context.game.setCurrentTurnValidation({
        status: ValidationStatus.Valid,
        cells: [cellIndex(112)],
        placements: [[{ cell: cellIndex(112), tile }]],
        words: ['TEST'],
        score: 10,
      });
      expect(context.game.currentTurnIsValid).toBe(true);
      expect(context.game.currentTurnScore).toBe(10);
      expect(context.game.currentTurnWords).toEqual(['TEST']);
    });
  });

});
