import Board from '@/domain/models/Board.ts';
import Dictionary from '@/domain/models/Dictionary.ts';
import Inventory from '@/domain/models/Inventory.ts';
import Match from '@/domain/models/Match.ts';
import Turns from '@/domain/models/Turns.ts';
import { IdGenerator } from '@/domain/ports.ts';
import CurrentTurnValidator, { ValidatorContext } from '@/domain/services/CurrentTurnValidator.ts';
import { GeneratorContext } from '@/domain/services/TurnGenerator.ts';
import {
  EventsSnapshot,
  GameBoardView,
  GameCell,
  GameEvent,
  GameEventType,
  GameInventoryView,
  GameMatchView,
  GamePlayer,
  GameSnapshot,
  GameTile,
  GameTurnsView,
} from '@/domain/types.ts';

const GAME_SNAPSHOT_VERSION = 1; //TODO connect to .env version

export default class Game {
  private constructor(
    private readonly board: Board,
    private readonly dictionary: Dictionary,
    private readonly inventory: Inventory,
    private readonly match: Match,
    private readonly turns: Turns,
    private readonly events: Events,
  ) {}

  static create(idGenerator: IdGenerator): Game {
    const players = Object.values(GamePlayer);
    const board = Board.create();
    const dictionary = Dictionary.create();
    const inventory = Inventory.create(players);
    const match = Match.create(players);
    const turns = Turns.create(idGenerator);
    const events = Events.create();
    const game = new Game(board, dictionary, inventory, match, turns, events);
    game.startTurnForNextPlayer();
    return game;
  }

  static restoreFromSnapshot(snapshot: GameSnapshot, idGenerator: IdGenerator): Game | null {
    if (snapshot.version !== GAME_SNAPSHOT_VERSION) return null;
    const board = Board.restoreFromSnapshot(snapshot.board);
    const dictionary = Dictionary.create();
    const inventory = Inventory.restoreFromSnapshot(snapshot.inventory);
    const match = Match.restoreFromSnapshot(snapshot.match);
    const turns = Turns.restoreFromSnapshot(snapshot.turns, idGenerator);
    const events = Events.restoreFromSnapshot(snapshot.events);
    return new Game(board, dictionary, inventory, match, turns, events);
  }

  get snapshot(): GameSnapshot {
    return {
      version: GAME_SNAPSHOT_VERSION,
      board: this.board.snapshot,
      inventory: this.inventory.snapshot,
      turns: this.turns.snapshot,
      match: this.match.snapshot,
      events: this.events.snapshot,
    };
  }

  get boardView(): Readonly<GameBoardView> {
    return this.board;
  }

  get inventoryView(): Readonly<GameInventoryView> {
    return this.inventory;
  }

  get turnsView(): Readonly<GameTurnsView> {
    return this.turns;
  }

  get matchView(): Readonly<GameMatchView> {
    return this.match;
  }

  get eventLog(): ReadonlyArray<GameEvent> {
    return this.events.logView;
  }

  placeTile(input: { cell: GameCell; tile: GameTile }): void {
    this.match.ensureMutability();
    this.board.placeTile(input.cell, input.tile);
    this.turns.recordPlacedTile(input.tile);
    this.events.record({ type: GameEventType.TilePlaced });
  }

  undoPlaceTile(input: { tile: GameTile }): void {
    this.match.ensureMutability();
    this.turns.undoRecordPlacedTile(input);
    this.board.undoPlaceTile(input.tile);
    this.events.record({ type: GameEventType.TileUndoPlaced });
  }

  clearTiles(): void {
    this.match.ensureMutability();
    for (const tile of this.turns.currentTurnTiles) this.board.undoPlaceTile(tile);
    this.turns.resetCurrentTurn();
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

  saveTurn(): { words: ReadonlyArray<string> } {
    this.match.ensureMutability();
    if (!this.turnsView.currentTurnIsValid) throw new Error('Turn is not valid');
    const {
      currentPlayer: player,
      currentTurnTiles: tiles,
      currentTurnWords: words,
      currentTurnScore: score,
    } = this.turnsView;
    if (words === undefined) throw new Error('Current turn words do not exist');
    if (score === undefined) throw new Error('Current turn score does not exist');
    tiles.forEach(tile => this.inventory.discardTile({ player, tile }));
    this.inventory.replenishTilesFor(player);
    this.match.incrementScore(player, score);
    this.startTurnForNextPlayer();
    const type = player === GamePlayer.User ? GameEventType.UserTurnSaved : GameEventType.OpponentTurnSaved;
    this.events.record({ type, words, score });
    return { words };
  }

  passTurn(): void {
    const { currentPlayer: player } = this.turnsView;
    this.match.ensureMutability();
    this.startTurnForNextPlayer();
    const type = player === GamePlayer.User ? GameEventType.UserTurnPassed : GameEventType.OpponentTurnPassed;
    this.events.record({ type });
  }

  createGeneratorContext(yieldControl: () => Promise<void>): GeneratorContext {
    return {
      board: Board.clone(this.board),
      dictionary: this.dictionary,
      inventory: this.inventory,
      turns: this.turns,
      yieldControl,
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

  resignMatch(): void {
    const { currentPlayer, nextPlayer } = this.turnsView;
    this.match.recordCompletion(nextPlayer, currentPlayer);
    this.events.record({ type: currentPlayer === GamePlayer.User ? GameEventType.MatchLost : GameEventType.MatchWon });
  }

  willPassBeResignFor(player: GamePlayer): boolean {
    const passType = player === GamePlayer.User ? GameEventType.UserTurnPassed : GameEventType.OpponentTurnPassed;
    const saveType = player === GamePlayer.User ? GameEventType.UserTurnSaved : GameEventType.OpponentTurnSaved;
    const lastTurnEvent = this.events.logView.findLast(e => e.type === passType || e.type === saveType);
    return lastTurnEvent?.type === passType;
  }

  clearAllEvents(): Array<GameEvent> {
    return this.events.clearAll();
  }

  private startTurnForNextPlayer(): void {
    this.turns.startTurnFor(this.turns.nextPlayer);
  }

  private completeMatch(winner: GamePlayer, loser: GamePlayer): void {
    this.match.recordCompletion(winner, loser);
  }

  private tieMatch(): void {
    this.match.recordTie(this.turnsView.currentPlayer, this.turnsView.nextPlayer);
  }
}

class Events {
  private readonly pending: Array<GameEvent> = [];

  private constructor(private readonly log: Array<GameEvent>) {}

  static create(): Events {
    return new Events([]);
  }

  static restoreFromSnapshot(snapshot: EventsSnapshot): Events {
    return new Events(snapshot.log);
  }

  get snapshot(): EventsSnapshot {
    return {
      log: this.log,
    };
  }

  get logView(): ReadonlyArray<GameEvent> {
    return [...this.log];
  }

  record(event: GameEvent): void {
    this.log.push(event);
    this.pending.push(event);
  }

  clearAll(): Array<GameEvent> {
    const copy = [...this.pending];
    this.pending.length = 0;
    return copy;
  }
}
