import Board from '@/domain/models/Board.ts';
import Dictionary from '@/domain/models/Dictionary.ts';
import Inventory from '@/domain/models/Inventory.ts';
import MatchTracker from '@/domain/models/MatchTracker.ts';
import TurnTracker from '@/domain/models/TurnTracker.ts';
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
  GameTurnView,
} from '@/domain/types.ts';

const GAME_SNAPSHOT_VERSION = 1; //TODO connect to .env version

export default class Game {
  private constructor(
    private readonly board: Board,
    private readonly dictionary: Dictionary,
    private readonly inventory: Inventory,
    private readonly matchTracker: MatchTracker,
    private readonly turnTracker: TurnTracker,
    private readonly events: Events,
  ) {}

  static create(idGenerator: IdGenerator): Game {
    const players = Object.values(GamePlayer);
    const board = Board.create();
    const dictionary = Dictionary.create();
    const inventory = Inventory.create(players);
    const matchTracker = MatchTracker.create(players);
    const turnTracker = TurnTracker.create(idGenerator);
    const events = Events.create();
    const game = new Game(board, dictionary, inventory, matchTracker, turnTracker, events);
    game.startTurnForNextPlayer();
    return game;
  }

  static restoreFromSnapshot(snapshot: GameSnapshot, idGenerator: IdGenerator): Game | null {
    if (snapshot.version !== GAME_SNAPSHOT_VERSION) return null;
    const board = Board.restoreFromSnapshot(snapshot.board);
    const dictionary = Dictionary.restoreFromSnapshot(snapshot.dictionary);
    const inventory = Inventory.restoreFromSnapshot(snapshot.inventory);
    const matchTracker = MatchTracker.restoreFromSnapshot(snapshot.matchTracker);
    const turnTracker = TurnTracker.restoreFromSnapshot(snapshot.turnTracker, idGenerator);
    const events = Events.restoreFromSnapshot(snapshot.events);
    return new Game(board, dictionary, inventory, matchTracker, turnTracker, events);
  }

  get snapshot(): GameSnapshot {
    return {
      version: GAME_SNAPSHOT_VERSION,
      board: this.board.snapshot,
      dictionary: this.dictionary.snapshot,
      inventory: this.inventory.snapshot,
      turnTracker: this.turnTracker.snapshot,
      matchTracker: this.matchTracker.snapshot,
      events: this.events.snapshot,
    };
  }

  get boardView(): Readonly<GameBoardView> {
    return this.board;
  }

  get inventoryView(): Readonly<GameInventoryView> {
    return this.inventory;
  }

  get turnView(): Readonly<GameTurnView> {
    return this.turnTracker;
  }

  get matchView(): Readonly<GameMatchView> {
    return this.matchTracker;
  }

  get eventLog(): ReadonlyArray<GameEvent> {
    return this.events.logView;
  }

  placeTile(input: { cell: GameCell; tile: GameTile }): void {
    this.matchTracker.ensureMutability();
    this.board.placeTile(input.cell, input.tile);
    this.turnTracker.placeTileInCurrentTurn(input.tile);
    this.events.record({ type: GameEventType.TilePlaced });
  }

  undoPlaceTile(input: { tile: GameTile }): void {
    this.matchTracker.ensureMutability();
    this.turnTracker.undoPlaceTileInCurrentTurn(input);
    this.board.undoPlaceTile(input.tile);
    this.events.record({ type: GameEventType.TileUndoPlaced });
  }

  clearTiles(): void {
    this.matchTracker.ensureMutability();
    for (const tile of this.turnTracker.currentTurnTiles) this.board.undoPlaceTile(tile);
    this.turnTracker.resetCurrentTurn();
  }

  validateTurn(): void {
    const result = CurrentTurnValidator.execute({
      board: this.board,
      dictionary: this.dictionary,
      inventory: this.inventory,
      turnTracker: this.turnTracker,
    } as ValidatorContext);
    this.turnTracker.setCurrentTurnValidation(result);
  }

  saveTurn(): { words: ReadonlyArray<string> } {
    this.matchTracker.ensureMutability();
    if (!this.turnView.currentTurnIsValid) throw new Error('Turn is not valid');
    const {
      currentPlayer: player,
      currentTurnTiles: tiles,
      currentTurnWords: words,
      currentTurnScore: score,
    } = this.turnView;
    if (words === undefined) throw new Error('Current turn words do not exist');
    if (score === undefined) throw new Error('Current turn score does not exist');
    tiles.forEach(tile => this.inventory.discardTile({ player, tile }));
    this.inventory.replenishTilesFor(player);
    this.turnTracker.commitCurrentTurnScore();
    this.startTurnForNextPlayer();
    const type = player === GamePlayer.User ? GameEventType.UserTurnSaved : GameEventType.OpponentTurnSaved;
    this.events.record({ type, words, score });
    return { words };
  }

  passTurn(): void {
    const { currentPlayer: player } = this.turnView;
    this.matchTracker.ensureMutability();
    this.startTurnForNextPlayer();
    const type = player === GamePlayer.User ? GameEventType.UserTurnPassed : GameEventType.OpponentTurnPassed;
    this.events.record({ type });
  }

  createGeneratorContext(yieldControl: () => Promise<void>): GeneratorContext {
    return {
      board: Board.clone(this.board),
      dictionary: this.dictionary,
      inventory: this.inventory,
      turnTracker: this.turnTracker,
      yieldControl,
    };
  }

  finishMatchByScore(): void {
    const { leaderByScore, loserByScore } = this.turnTracker;
    if (leaderByScore === null || loserByScore === null) {
      this.tieMatch();
      this.events.record({ type: GameEventType.MatchTied });
      return;
    }
    this.completeMatch(leaderByScore, loserByScore);
    this.events.record({ type: leaderByScore === GamePlayer.User ? GameEventType.MatchWon : GameEventType.MatchLost });
  }

  resignMatch(): void {
    const { currentPlayer, nextPlayer } = this.turnView;
    this.matchTracker.recordCompletion(nextPlayer, currentPlayer);
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
    this.turnTracker.createNewTurnFor(this.turnTracker.nextPlayer);
  }

  private completeMatch(winner: GamePlayer, loser: GamePlayer): void {
    this.matchTracker.recordCompletion(winner, loser);
  }

  private tieMatch(): void {
    this.matchTracker.recordTie(this.turnView.currentPlayer, this.turnView.nextPlayer);
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
