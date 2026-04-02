import Board from '@/domain/models/Board.ts';
import Dictionary from '@/domain/models/Dictionary.ts';
import Inventory from '@/domain/models/Inventory.ts';
import Match from '@/domain/models/Match.ts';
import Turns from '@/domain/models/Turns.ts';
import { IdGenerator } from '@/domain/ports.ts';
import CurrentTurnValidator, { ValidatorContext } from '@/domain/services/CurrentTurnValidator.ts';
import { GeneratorContext, GeneratorResult } from '@/domain/services/TurnGenerator.ts';
import {
  EventsSnapshot,
  GameBoardView,
  GameBonusDistribution,
  GameCell,
  GameDifficulty,
  GameEvent,
  GameEventType,
  GameInventoryView,
  GameMatchView,
  GamePlayer,
  GameSettings,
  GameSnapshot,
  GameTile,
  GameTurnsView,
} from '@/domain/types.ts';

class Events {
  get logView(): ReadonlyArray<GameEvent> {
    return [...this.log];
  }

  get snapshot(): EventsSnapshot {
    return {
      log: [...this.log],
    };
  }

  private constructor(private readonly log: Array<GameEvent>) {}

  static create(): Events {
    return new Events([]);
  }

  static restoreFromSnapshot(snapshot: EventsSnapshot): Events {
    return new Events(snapshot.log);
  }

  record(event: GameEvent): void {
    this.log.push(event);
  }
}

export default class Game {
  get boardView(): Readonly<GameBoardView> {
    return this.board;
  }

  get eventLog(): ReadonlyArray<GameEvent> {
    return this.events.logView;
  }

  get inventoryView(): Readonly<GameInventoryView> {
    return this.inventory;
  }

  get matchView(): Readonly<GameMatchView> {
    return this.match;
  }

  get settingsChangeIsAllowed(): boolean {
    return !this.turns.historyHasPriorTurns;
  }

  get snapshot(): GameSnapshot {
    return {
      board: this.board.snapshot,
      difficulty: this.difficulty,
      events: this.events.snapshot,
      inventory: this.inventory.snapshot,
      match: this.match.snapshot,
      turns: this.turns.snapshot,
      version: this.version,
    };
  }

  get turnsView(): Readonly<GameTurnsView> {
    return this.turns;
  }

  private constructor(
    private readonly version: string,
    private readonly board: Board,
    private readonly dictionary: Dictionary,
    private readonly inventory: Inventory,
    private readonly match: Match,
    private readonly turns: Turns,
    private readonly events: Events,
    public difficulty: GameDifficulty,
  ) {}

  static create(version: string, idGenerator: IdGenerator, dictionary: Dictionary, settings: GameSettings): Game {
    const players = Object.values(GamePlayer);
    const board = Board.create(settings.bonusDistribution);
    const inventory = Inventory.create(players);
    const match = Match.create(players);
    const turns = Turns.create(idGenerator);
    const events = Events.create();
    const game = new Game(version, board, dictionary, inventory, match, turns, events, settings.difficulty);
    game.startTurnForNextPlayer();
    return game;
  }

  static restoreFromSnapshot(version: string, snapshot: GameSnapshot, idGenerator: IdGenerator, dictionary: Dictionary): Game | null {
    if (snapshot.version !== version) return null;
    const board = Board.restoreFromSnapshot(snapshot.board);
    const inventory = Inventory.restoreFromSnapshot(snapshot.inventory);
    const match = Match.restoreFromSnapshot(snapshot.match);
    const turns = Turns.restoreFromSnapshot(snapshot.turns, idGenerator);
    const events = Events.restoreFromSnapshot(snapshot.events);
    return new Game(version, board, dictionary, inventory, match, turns, events, snapshot.difficulty);
  }

  applyGeneratedTurn(result: GeneratorResult): { score: number; words: ReadonlyArray<string> } {
    this.ensureMutability();
    for (let i = 0; i < result.tiles.length; i++) {
      this.board.placeTile(result.cells[i], result.tiles[i]);
      this.turns.recordPlacedTile(result.tiles[i]);
    }
    this.turns.recordValidationResult(result.validationResult);
    const { score } = result.validationResult;
    const { words } = this.saveTurn();
    return { score, words };
  }

  changeBonusDistribution(bonusDistribution: GameBonusDistribution): void {
    this.ensureSettingsMutability();
    this.board.changeBonusDistribution(bonusDistribution);
  }

  changeDifficulty(newValue: GameDifficulty) {
    this.ensureSettingsMutability();
    this.difficulty = newValue;
  }

  clearTiles(): void {
    this.ensureMutability();
    for (const tile of this.turns.currentTurnTiles) this.board.undoPlaceTile(tile);
    this.turns.resetCurrentTurn();
  }

  createGeneratorContext(): GeneratorContext {
    return {
      board: Board.clone(this.board),
      dictionary: this.dictionary,
      inventory: this.inventory,
      turns: Turns.clone(this.turns),
    };
  }

  finishMatchByScore(): void {
    const { leaderByScore, loserByScore } = this.match;
    if (leaderByScore === null || loserByScore === null) {
      this.tieMatch();
      this.events.record({ type: GameEventType.MatchTied });
      return;
    }
    this.completeMatch(leaderByScore, loserByScore);
    this.events.record({ type: leaderByScore === GamePlayer.User ? GameEventType.MatchWon : GameEventType.MatchLost });
  }

  passTurn(): void {
    const { currentPlayer: player } = this.turnsView;
    this.ensureMutability();
    this.startTurnForNextPlayer();
    const type = player === GamePlayer.User ? GameEventType.UserTurnPassed : GameEventType.OpponentTurnPassed;
    this.events.record({ type });
  }

  placeTile(input: { cell: GameCell; tile: GameTile }): void {
    this.ensureMutability();
    this.board.placeTile(input.cell, input.tile);
    this.turns.recordPlacedTile(input.tile);
    this.events.record({ type: GameEventType.TilePlaced });
  }

  resignMatch(): void {
    const { currentPlayer, nextPlayer } = this.turnsView;
    this.match.recordCompletion(nextPlayer, currentPlayer);
    this.events.record({ type: currentPlayer === GamePlayer.User ? GameEventType.MatchLost : GameEventType.MatchWon });
  }

  saveTurn(): { words: ReadonlyArray<string> } {
    this.ensureMutability();
    if (!this.turnsView.currentTurnIsValid) throw new Error('Turn is not valid');
    const { currentPlayer: player, currentTurnScore: score, currentTurnTiles: tiles, currentTurnWords: words } = this.turnsView;
    if (words === undefined) throw new Error('Current turn words do not exist');
    if (score === undefined) throw new Error('Current turn score does not exist');
    tiles.forEach(tile => this.inventory.discardTile({ player, tile }));
    this.inventory.replenishTilesFor(player);
    this.match.incrementScore(player, score);
    this.startTurnForNextPlayer();
    const type = player === GamePlayer.User ? GameEventType.UserTurnSaved : GameEventType.OpponentTurnSaved;
    this.events.record({ score, type, words });
    return { words };
  }

  undoPlaceTile(input: { tile: GameTile }): void {
    this.ensureMutability();
    this.turns.undoRecordPlacedTile(input);
    this.board.undoPlaceTile(input.tile);
    this.events.record({ type: GameEventType.TileUndoPlaced });
  }

  validateTurn(): void {
    const result = CurrentTurnValidator.execute({
      board: this.board,
      dictionary: this.dictionary,
      inventory: this.inventory,
      turns: this.turns,
    } as ValidatorContext);
    this.turns.recordValidationResult(result);
  }

  willPassBeResignFor(player: GamePlayer): boolean {
    const passType = player === GamePlayer.User ? GameEventType.UserTurnPassed : GameEventType.OpponentTurnPassed;
    const saveType = player === GamePlayer.User ? GameEventType.UserTurnSaved : GameEventType.OpponentTurnSaved;
    const lastTurnEvent = this.events.logView.findLast(e => e.type === passType || e.type === saveType);
    return lastTurnEvent?.type === passType;
  }

  private completeMatch(winner: GamePlayer, loser: GamePlayer): void {
    this.match.recordCompletion(winner, loser);
  }

  private ensureMutability(): void {
    if (this.match.isFinished) throw new Error('Match is finished');
  }

  private ensureSettingsMutability(): void {
    if (!this.settingsChangeIsAllowed) throw new Error('Settings change is not allowed');
  }

  private startTurnForNextPlayer(): void {
    this.turns.startTurnFor(this.turns.nextPlayer);
  }

  private tieMatch(): void {
    this.match.recordTie(this.turnsView.currentPlayer, this.turnsView.nextPlayer);
  }
}
