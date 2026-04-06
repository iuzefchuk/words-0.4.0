import { Player } from '@/domain/enums.ts';
import Turns, { ValidationError, ValidationStatus } from '@/domain/models/Turns.ts';
import areEqual from '$/areEqual.ts';
import { createCellIndex, createTileId } from '$/unit/helpers/casts.ts';
import { StubIdGenerator } from '$/unit/helpers/stubs.ts';

describe('Turns', () => {
  describe('initial state', () => {
    let turns: Turns;

    it('should have empty history', () => {
      expect(turns.historyHasPriorTurns).toBe(false);
    });

    it('should display current turn properties correctly', () => {
      expect(turns.currentTurnIsValid).toBe(false);
      expect(turns.currentTurnScore).toBeUndefined();
      expect(turns.currentTurnWords).toBeUndefined();
      expect(turns.currentTurnCells).toBeUndefined();
      expect(turns.currentTurnTiles).toHaveLength(0);
    });

    it('should not have current player', () => {
      expect(() => turns.currentPlayer).toThrow();
    });

    it('should have default next player', () => {
      expect(turns.nextPlayer).toBe(Player.User);
    });

    beforeEach(() => {
      turns = Turns.create(new StubIdGenerator());
    });
  });

  describe('turn start', () => {
    let turns: Turns;

    it('should start with correct player', () => {
      expect(turns.currentPlayer).toBe(Player.User);
      expect(turns.nextPlayer).toBe(Player.Opponent);
    });

    it('should not start for same player twice in a row', () => {
      expect(() => turns.startTurnFor(Player.User)).toThrow();
    });

    beforeEach(() => {
      turns = Turns.create(new StubIdGenerator());
      turns.startTurnFor(Player.User);
    });
  });

  describe('turn validation', () => {
    let turns: Turns;

    it('should register valid result correctly', () => {
      const cells = [createCellIndex(112), createCellIndex(113), createCellIndex(114)];
      const score = 10;
      const words = ['CAT'];
      turns.recordValidationResult({ cells, placements: [], score, status: ValidationStatus.Valid, words });
      expect(turns.currentTurnIsValid).toBe(true);
      expect(turns.currentTurnScore).toBe(score);
      expect(turns.currentTurnWords).toEqual(words);
      expect(turns.currentTurnCells).toEqual(cells);
    });

    it('should register invalid result correctly', () => {
      turns.recordValidationResult({ error: ValidationError.WordNotInDictionary, status: ValidationStatus.Invalid });
      expect(turns.currentTurnIsValid).toBe(false);
    });

    beforeEach(() => {
      turns = Turns.create(new StubIdGenerator());
      turns.startTurnFor(Player.User);
    });
  });

  describe('turn reset', () => {
    let turns: Turns;

    it('should reset properties correctly', () => {
      turns.recordPlacedTile(createTileId('A-0'));
      turns.recordValidationResult({ cells: [createCellIndex(112)], placements: [], score: 5, status: ValidationStatus.Valid, words: ['AT'] });
      turns.resetCurrentTurn();
      expect(turns.currentTurnTiles).toHaveLength(0);
      expect(turns.currentTurnIsValid).toBe(false);
    });

    beforeEach(() => {
      turns = Turns.create(new StubIdGenerator());
      turns.startTurnFor(Player.User);
    });
  });

  describe('history', () => {
    let turns: Turns;

    it('should display correct prior turns amount', () => {
      expect(turns.historyHasPriorTurns).toBe(false);
      turns.startTurnFor(Player.Opponent);
      expect(turns.historyHasPriorTurns).toBe(true);
    });

    it('should display previous turn correctly', () => {
      expect(turns.previousTurnTiles).toBeUndefined();
      const tileId = createTileId('A-0');
      turns.recordPlacedTile(tileId);
      turns.startTurnFor(Player.Opponent);
      expect(turns.currentTurnTiles).not.toContain(tileId);
      expect(turns.previousTurnTiles).toContain(tileId);
    });

    beforeEach(() => {
      turns = Turns.create(new StubIdGenerator());
      turns.startTurnFor(Player.User);
    });
  });

  describe('how tiles are recorded', () => {
    let turns: Turns;

    it('should record tile correctly', () => {
      const tileId = createTileId('A-0');
      turns.recordPlacedTile(tileId);
      expect(turns.currentTurnTiles).toContain(tileId);
    });

    it('should record multiple tiles correctly', () => {
      const firstTileId = createTileId('A-0');
      const secondTileId = createTileId('B-0');
      turns.recordPlacedTile(firstTileId);
      turns.recordPlacedTile(secondTileId);
      expect(turns.currentTurnTiles).toContain(firstTileId);
      expect(turns.currentTurnTiles).toContain(secondTileId);
    });

    it('should not record a duplicate tile', () => {
      const tileId = createTileId('A-0');
      turns.recordPlacedTile(tileId);
      expect(() => turns.recordPlacedTile(tileId)).toThrow();
    });

    it('should undo record correctly', () => {
      const tileId = createTileId('A-0');
      turns.recordPlacedTile(tileId);
      turns.undoRecordPlacedTile({ tile: tileId });
      expect(turns.currentTurnTiles).not.toContain(tileId);
    });

    it('should not undo record for tile not in current turn', () => {
      expect(() => turns.undoRecordPlacedTile({ tile: createTileId('A-0') })).toThrow();
    });

    beforeEach(() => {
      turns = Turns.create(new StubIdGenerator());
      turns.startTurnFor(Player.User);
    });
  });

  describe('snapshot', () => {
    let turns: Turns;

    it('should capture and restore history', () => {
      turns.recordPlacedTile(createTileId('A-0'));
      const { history } = turns.snapshot;
      const restoredTurns = Turns.restoreFromSnapshot(new StubIdGenerator(), turns.snapshot);
      expect(areEqual(restoredTurns.snapshot.history, history)).toBe(true);
    });

    beforeEach(() => {
      turns = Turns.create(new StubIdGenerator());
      turns.startTurnFor(Player.User);
    });
  });
});
