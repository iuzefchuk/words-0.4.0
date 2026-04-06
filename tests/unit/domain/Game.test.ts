import { Difficulty, EventType, Player } from '@/domain/enums.ts';
import Game from '@/domain/index.ts';
import { BonusDistribution } from '@/domain/models/Board.ts';
import Dictionary from '@/domain/models/Dictionary.ts';
import { MatchResult } from '@/domain/models/Match.ts';
import areEqual from '$/areEqual.ts';
import { createCellIndex } from '$/unit/helpers/casts.ts';
import { StubIdGenerator } from '$/unit/helpers/stubs.ts';

let dictionary: Dictionary;

beforeAll(async () => {
  dictionary = await Dictionary.create();
});

function createGame(overrides?: { bonusDistribution?: BonusDistribution; difficulty?: Difficulty; version?: string }) {
  const version = overrides?.version ?? '1.0.0';
  const bonusDistribution = overrides?.bonusDistribution ?? BonusDistribution.Classic;
  const difficulty = overrides?.difficulty ?? Difficulty.Low;
  return Game.create(version, new StubIdGenerator(), dictionary, { bonusDistribution, difficulty });
}

describe('Game', () => {
  describe('initial state', () => {
    it('should have board, inventory, match, turns, and events', () => {
      const game = createGame();
      expect(game.boardView).toBeDefined();
      expect(game.inventoryView).toBeDefined();
      expect(game.matchView).toBeDefined();
      expect(game.turnsView).toBeDefined();
      expect(game.eventLog).toBeDefined();
    });

    it('should have User as current player', () => {
      const game = createGame();
      expect(game.turnsView.currentPlayer).toBe(Player.User);
    });

    it('should allow settings change before second turn', () => {
      const game = createGame();
      expect(game.settingsChangeIsAllowed).toBe(true);
    });

    it('should not allow settings change after second turn', () => {
      const game = createGame();
      game.passTurnForCurrentPlayer();
      expect(game.settingsChangeIsAllowed).toBe(false);
    });

    it('should apply settings correctly', () => {
      const bonusDistribution = BonusDistribution.Random;
      const difficulty = Difficulty.High;
      const game = createGame({ bonusDistribution, difficulty });
      expect(game.boardView.bonusDistribution).toBe(bonusDistribution);
      expect(game.difficulty).toBe(difficulty);
    });
  });

  describe('settings', () => {
    let game: Game;

    it('should update difficulty correctly', () => {
      const difficulty = Difficulty.High;
      game.changeDifficulty(difficulty);
      expect(game.difficulty).toBe(difficulty);
    });

    it('should update bonus distribution correctly', () => {
      const bonusDistribution = BonusDistribution.Random;
      game.changeBonusDistribution(bonusDistribution);
      expect(game.boardView.bonusDistribution).toBe(bonusDistribution);
    });

    beforeEach(() => {
      game = createGame();
    });
  });

  describe('how game progresses', () => {
    let game: Game;

    it('should add tile to board and turn', () => {
      const cellIndex = createCellIndex(0);
      const tiles = game.inventoryView.getTilesFor(Player.User);
      const firstTileId = tiles[0]!;
      game.placeTile({ cell: cellIndex, tile: firstTileId });
      expect(game.boardView.findTileByCell(cellIndex)).toBe(firstTileId);
      expect(game.turnsView.currentTurnTiles).toContain(firstTileId);
    });

    it('should remove tile from board and turn', () => {
      const cellIndex = createCellIndex(0);
      const tiles = game.inventoryView.getTilesFor(Player.User);
      const firstTileId = tiles[0]!;
      game.placeTile({ cell: cellIndex, tile: firstTileId });
      game.undoPlaceTile({ tile: firstTileId });
      expect(game.boardView.findTileByCell(cellIndex)).toBeUndefined();
      expect(game.turnsView.currentTurnTiles).not.toContain(firstTileId);
    });

    it('should reset turn tiles when clearing', () => {
      const firstCellIndex = createCellIndex(0);
      const secondCellIndex = createCellIndex(1);
      const tiles = game.inventoryView.getTilesFor(Player.User);
      const firstTileId = tiles[0]!;
      const secondTileId = tiles[1]!;
      game.placeTile({ cell: firstCellIndex, tile: firstTileId });
      game.placeTile({ cell: secondCellIndex, tile: secondTileId });
      game.clearTiles();
      expect(game.turnsView.currentTurnTiles).toHaveLength(0);
      expect(game.boardView.findTileByCell(firstCellIndex)).toBeUndefined();
      expect(game.boardView.findTileByCell(secondCellIndex)).toBeUndefined();
    });

    it('should validate turn', () => {
      //TODO validateTurn
    });

    it('should save valid turn', () => {
      //TODO saveTurnForCurrentPlayer
    });

    // TODO applyGeneratedTurn, finishMatchByScore

    it('should not save invalid turn', () => {
      expect(() => game.saveTurnForCurrentPlayer()).toThrow();
    });

    it('should pass correctly', () => {
      expect(game.turnsView.currentPlayer).toBe(Player.User);
      game.passTurnForCurrentPlayer();
      expect(game.turnsView.currentPlayer).toBe(Player.Opponent);
    });

    beforeEach(() => {
      game = createGame();
    });
  });

  describe('how game ends', () => {
    let game: Game;

    it('should register resign correctly', () => {
      game.resignMatchForCurrentPlayer();
      expect(game.matchView.isFinished).toBe(true);
      expect(game.matchView.getResultFor(Player.User)).toBe(MatchResult.Lose);
      expect(game.matchView.getResultFor(Player.Opponent)).toBe(MatchResult.Win);
    });

    it('should register tie correctly', () => {
      game.finishMatchByScore(); // Score is 0 - 0
      expect(game.matchView.getResultFor(Player.User)).toBe(MatchResult.Tie);
      expect(game.matchView.getResultFor(Player.Opponent)).toBe(MatchResult.Tie);
    });

    it('should return pass->resign flow mark correctly', () => {
      expect(game.willPassBeResignFor(Player.User)).toBe(false);
      game.passTurnForCurrentPlayer();
      expect(game.willPassBeResignFor(Player.User)).toBe(true);
    });

    beforeEach(() => {
      game = createGame();
    });
  });

  describe('how events log', () => {
    let game: Game;

    it('should log correctly when doing place tile', () => {
      const cellIndex = createCellIndex(0);
      const tiles = game.inventoryView.getTilesFor(Player.User);
      const firstTileId = tiles[0]!;
      game.placeTile({ cell: cellIndex, tile: firstTileId });
      expect(game.eventLog).toHaveLength(1);
      const lastEvent = game.eventLog.at(-1)!;
      expect(lastEvent.type === EventType.TilePlaced).toBe(true);
    });

    it('should log correctly when undoing place tile', () => {
      const cellIndex = createCellIndex(0);
      const tiles = game.inventoryView.getTilesFor(Player.User);
      const firstTileId = tiles[0]!;
      game.placeTile({ cell: cellIndex, tile: firstTileId });
      game.undoPlaceTile({ tile: firstTileId });
      expect(game.eventLog).toHaveLength(2);
      const lastEvent = game.eventLog.at(-1)!;
      expect(lastEvent.type === EventType.TileUndoPlaced).toBe(true);
    });

    it('should log correctly on pass', () => {
      game.passTurnForCurrentPlayer(); // User passes
      expect(game.eventLog).toHaveLength(1);
      const lastEvent = game.eventLog.at(-1)!;
      expect(lastEvent.type === EventType.UserTurnPassed).toBe(true);
      game.passTurnForCurrentPlayer(); // Opponent passes
      expect(game.eventLog).toHaveLength(2);
      expect(lastEvent.type === EventType.OpponentTurnPassed).toBe(true);
    });

    it('should log correctly on match end', () => {
      game.resignMatchForCurrentPlayer();
      expect(game.eventLog).toHaveLength(1);
      const lastEvent = game.eventLog.at(-1)!;
      expect(lastEvent.type === EventType.MatchLost).toBe(true);
    });

    //TODO for all events

    beforeEach(() => {
      game = createGame();
    });
  });

  describe('snapshot', () => {
    let game: Game;

    it('should capture and restore', () => {
      const { snapshot } = game;
      const restoredGame = Game.restoreFromSnapshot(game.snapshot.version, snapshot, new StubIdGenerator(), dictionary)!;
      expect(areEqual(restoredGame.snapshot, snapshot)).toBe(true);
    });

    it('should restore from same version', () => {
      const { snapshot } = game;
      const restoredGame = Game.restoreFromSnapshot(game.snapshot.version, snapshot, new StubIdGenerator(), dictionary);
      expect(restoredGame).not.toBeNull();
    });

    it('should not restore from different version', () => {
      const { snapshot } = game;
      const restoredGame = Game.restoreFromSnapshot(`1${game.snapshot.version}`, snapshot, new StubIdGenerator(), dictionary);
      expect(restoredGame).toBeNull();
    });

    beforeEach(() => {
      game = createGame();
      game.changeDifficulty(Difficulty.High);
      game.passTurnForCurrentPlayer();
      game.passTurnForCurrentPlayer();
    });
  });
});
