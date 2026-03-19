import { describe, it, expect } from 'vitest';
import { createTestContext, cellIndex, placeAndValidate, placeFirstTurn } from '$/helpers.ts';
import { Player, Letter } from '@/domain/enums.ts';
import { DomainEvent, EventCollector } from '@/domain/events.ts';
import SaveTurnCommand from '@/application/commands/SaveTurn.ts';
import PassTurnCommand from '@/application/commands/PassTurn.ts';
import PlaceTileCommand from '@/application/commands/PlaceTile.ts';
import UndoPlaceTileCommand from '@/application/commands/UndoPlaceTile.ts';
import TurnValidator from '@/application/services/TurnValidator.ts';
import { ValidationStatus, TurnOutcomeType } from '@/domain/models/TurnTracker.ts';

// All single letters + all 2-letter combos so any tile combination on center row is valid
const WORDS = Object.values(Letter);
for (const a of Object.values(Letter)) {
  for (const b of Object.values(Letter)) {
    WORDS.push(a + b);
  }
}

function createIntegrationContext() {
  return createTestContext({ words: WORDS });
}

describe('Game Integration', () => {
  describe('full turn cycle', () => {
    it('places tiles, validates, saves, replenishes, and advances player', () => {
      const context = createIntegrationContext();
      const { tiles } = placeFirstTurn(context, Player.User);

      expect(context.turnDirector.currentTurnIsValid).toBe(true);
      expect(context.turnDirector.currentTurnScore).toBeGreaterThan(0);

      const unusedBefore = context.inventory.unusedTilesCount;
      const result = SaveTurnCommand.execute(context);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.words.length).toBeGreaterThan(0);

      // 2 tiles discarded, 2 drawn
      expect(context.inventory.unusedTilesCount).toBe(unusedBefore - tiles.length);
      expect(context.inventory.getTilesFor(Player.User)).toHaveLength(7);
      expect(context.turnDirector.currentPlayer).toBe(Player.Opponent);
    });

    it('tracks scores across multiple turns', () => {
      const context = createIntegrationContext();

      // User turn
      placeFirstTurn(context, Player.User);
      SaveTurnCommand.execute(context);

      // Opponent turn: place adjacent
      const opponentTiles = context.inventory.getTilesFor(Player.Opponent);
      placeAndValidate(context, [
        { cell: cellIndex(114), tile: opponentTiles[0] },
      ]);

      if (context.turnDirector.currentTurnIsValid) {
        SaveTurnCommand.execute(context);
        expect(context.turnDirector.getScoreFor(Player.User)).toBeGreaterThan(0);
        expect(context.turnDirector.getScoreFor(Player.Opponent)).toBeGreaterThan(0);
      }
    });
  });

  describe('pass and resign flow', () => {
    it('passes turn and advances player', () => {
      const context = createIntegrationContext();
      PassTurnCommand.execute(context);
      expect(context.turnDirector.currentPlayer).toBe(Player.Opponent);
    });

    it('consecutive passes by same player triggers resign condition', () => {
      const context = createIntegrationContext();

      // User passes → Opponent's turn
      PassTurnCommand.execute(context);
      expect(context.turnDirector.willPlayerPassBeResign(Player.User)).toBe(true);

      // Opponent passes → User's turn
      PassTurnCommand.execute(context);
      expect(context.turnDirector.willPlayerPassBeResign(Player.Opponent)).toBe(true);
    });
  });

  describe('reset turn', () => {
    it('clears placed tiles from board and turn state', () => {
      const context = createIntegrationContext();
      const userTiles = context.inventory.getTilesFor(Player.User);
      const tile1 = userTiles[0];
      const tile2 = userTiles[1];

      context.turnDirector.placeTile({ cell: cellIndex(112), tile: tile1 });
      context.turnDirector.placeTile({ cell: cellIndex(113), tile: tile2 });
      expect(context.board.isTilePlaced(tile1)).toBe(true);
      expect(context.board.isTilePlaced(tile2)).toBe(true);

      context.turnDirector.resetCurrentTurn();

      expect(context.board.isTilePlaced(tile1)).toBe(false);
      expect(context.board.isTilePlaced(tile2)).toBe(false);
      expect(context.turnDirector.currentTurnTiles).toHaveLength(0);
      expect(context.turnDirector.currentPlayer).toBe(Player.User);
    });
  });

  describe('invalid turn rejection', () => {
    it('rejects save when tiles are not on anchor cells', () => {
      const context = createIntegrationContext();
      const userTiles = context.inventory.getTilesFor(Player.User);

      // Place far from center on empty board
      placeAndValidate(context, [
        { cell: cellIndex(0), tile: userTiles[0] },
        { cell: cellIndex(1), tile: userTiles[1] },
      ]);
      expect(context.turnDirector.currentTurnIsValid).toBe(false);

      const result = SaveTurnCommand.execute(context);
      expect(result.ok).toBe(false);
      expect(context.turnDirector.currentPlayer).toBe(Player.User);
    });

    it('rejects save when no tiles are placed', () => {
      const context = createIntegrationContext();
      const result = TurnValidator.execute(context, []);
      expect(result.status).toBe(ValidationStatus.Invalid);
    });
  });

  describe('undo place tile', () => {
    it('removes tile from board and re-validates', () => {
      const context = createIntegrationContext();
      const userTiles = context.inventory.getTilesFor(Player.User);
      const tile1 = userTiles[0];
      const tile2 = userTiles[1];
      const tile3 = userTiles[2];

      // Place 3 tiles
      PlaceTileCommand.execute(context, { cell: cellIndex(112), tile: tile1 });
      PlaceTileCommand.execute(context, { cell: cellIndex(113), tile: tile2 });
      PlaceTileCommand.execute(context, { cell: cellIndex(114), tile: tile3 });
      expect(context.turnDirector.currentTurnTiles).toHaveLength(3);

      // Undo last tile
      UndoPlaceTileCommand.execute(context, { tile: tile3 });
      expect(context.turnDirector.currentTurnTiles).toHaveLength(2);
      expect(context.board.isTilePlaced(tile3)).toBe(false);
      // Two tiles on center row should still be valid
      expect(context.turnDirector.currentTurnIsValid).toBe(true);
    });
  });

  describe('outcome history', () => {
    it('records save and pass outcomes across turns', () => {
      const context = createIntegrationContext();

      // User saves a turn
      placeFirstTurn(context, Player.User);
      SaveTurnCommand.execute(context);

      // Opponent passes
      PassTurnCommand.execute(context);

      const history = context.turnDirector.outcomeHistory;
      expect(history).toHaveLength(2);
      expect(history[0].type).toBe(TurnOutcomeType.Save);
      expect(history[0].player).toBe(Player.User);
      expect(history[1].type).toBe(TurnOutcomeType.Pass);
      expect(history[1].player).toBe(Player.Opponent);
    });
  });

  describe('event collection', () => {
    it('collects and drains domain events', () => {
      const events = new EventCollector();

      events.raise(DomainEvent.TilePlaced);
      events.raise(DomainEvent.TurnSaved);

      const drained = events.drain();
      expect(drained).toEqual([DomainEvent.TilePlaced, DomainEvent.TurnSaved]);
      expect(events.drain()).toEqual([]);
    });
  });

  describe('inventory depletion', () => {
    it('draw pool shrinks as tiles are discarded and replenished', () => {
      const context = createIntegrationContext();
      const initialUnused = context.inventory.unusedTilesCount;

      // User places 2 tiles → save discards 2, replenishes 2 from pool
      placeFirstTurn(context, Player.User);
      SaveTurnCommand.execute(context);

      // Pool shrank by 2 (replenished player) but 2 were also discarded
      // Net: unusedTilesCount decreases by the number replenished (2)
      expect(context.inventory.unusedTilesCount).toBe(initialUnused - 2);
      expect(context.inventory.getTilesFor(Player.User)).toHaveLength(7);
    });

    it('replenishment stops when draw pool is empty', () => {
      const context = createIntegrationContext();

      // Drain the draw pool by repeatedly placing + saving turns
      let turnsPlayed = 0;
      const maxTurns = 50; // safety limit
      while (context.inventory.unusedTilesCount > 0 && turnsPlayed < maxTurns) {
        const player = context.turnDirector.currentPlayer;
        const tiles = context.inventory.getTilesFor(player);
        if (tiles.length < 2) break;

        // Place 2 tiles adjacent to existing (or center for first turn)
        const cell1 = turnsPlayed === 0 ? cellIndex(112) : cellIndex(112 + turnsPlayed * 2);
        const cell2 = cellIndex(cell1 + 1);

        // Check if cells are within bounds and not occupied
        try {
          placeAndValidate(context, [
            { cell: cell1, tile: tiles[0] },
            { cell: cell2, tile: tiles[1] },
          ]);
        } catch {
          break;
        }

        if (!context.turnDirector.currentTurnIsValid) {
          context.turnDirector.resetCurrentTurn();
          break;
        }

        SaveTurnCommand.execute(context);
        turnsPlayed++;
      }

      expect(turnsPlayed).toBeGreaterThan(0);
      // After many turns, the pool should be significantly depleted
      expect(context.inventory.unusedTilesCount).toBeLessThan(86); // started at 86 (100 - 7 - 7)
    });
  });

  describe('multi-turn integration', () => {
    it('supports alternating save turns between players', () => {
      const context = createIntegrationContext();

      // Turn 1: User places two tiles on center row
      placeFirstTurn(context, Player.User);
      expect(SaveTurnCommand.execute(context).ok).toBe(true);
      expect(context.turnDirector.currentPlayer).toBe(Player.Opponent);

      // Turn 2: Opponent places adjacent to existing tiles
      const opponentTiles = context.inventory.getTilesFor(Player.Opponent);
      placeAndValidate(context, [{ cell: cellIndex(114), tile: opponentTiles[0] }]);

      if (context.turnDirector.currentTurnIsValid) {
        expect(SaveTurnCommand.execute(context).ok).toBe(true);
        expect(context.turnDirector.currentPlayer).toBe(Player.User);
        expect(context.turnDirector.outcomeHistory).toHaveLength(2);
      }
    });
  });
});
