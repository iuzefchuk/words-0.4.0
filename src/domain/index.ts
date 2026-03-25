import Board from '@/domain/models/Board.ts';
import Dictionary from '@/domain/models/Dictionary.ts';
import Inventory from '@/domain/models/Inventory.ts';
import MatchTracker from '@/domain/models/MatchTracker.ts';
import TurnTracker from '@/domain/models/TurnTracker.ts';
import CurrentTurnValidator, { ValidatorContext } from '@/domain/services/CurrentTurnValidator.ts';
import { GeneratorContext } from '@/domain/services/TurnGenerator.ts';
import {
  GameBoardView,
  GameCell,
  GameEvent,
  GameEventType,
  GameInventoryView,
  GameMatchView,
  GamePlayer,
  GameTile,
  GameTurnView,
} from '@/domain/types.ts';
import { IdGenerator } from '@/shared/ports.ts';

export default class Game {
  private readonly events = new Events();

  private constructor(
    private readonly board: Board,
    private readonly dictionary: Dictionary,
    private readonly inventory: Inventory,
    private readonly matchTracker: MatchTracker,
    private readonly turnTracker: TurnTracker,
  ) {}

  static create(dictionary: Dictionary, idGenerator: IdGenerator): Game {
    const board = Board.create();
    const players = Object.values(GamePlayer);
    const inventory = Inventory.create(players, idGenerator);
    const matchTracker = MatchTracker.create(players);
    const turnTracker = TurnTracker.create(idGenerator);
    const game = new Game(board, dictionary, inventory, matchTracker, turnTracker);
    game.startTurnForNextPlayer();
    return game;
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
    return this.events.log;
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

  startTurnForNextPlayer(): void {
    this.turnTracker.createNewTurnFor(this.turnTracker.nextPlayer);
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

  completeMatch(winner: GamePlayer, loser: GamePlayer): void {
    this.matchTracker.recordCompletion(winner, loser);
  }

  tieMatch(): void {
    this.matchTracker.recordTie(this.turnView.currentPlayer, this.turnView.nextPlayer);
  }

  resignMatch(): void {
    const { currentPlayer, nextPlayer } = this.turnView;
    this.matchTracker.recordCompletion(nextPlayer, currentPlayer);
    this.events.record({ type: currentPlayer === GamePlayer.User ? GameEventType.MatchLost : GameEventType.MatchWon });
  }

  willPassBeResignFor(player: GamePlayer): boolean {
    const passType = player === GamePlayer.User ? GameEventType.UserTurnPassed : GameEventType.OpponentTurnPassed;
    const saveType = player === GamePlayer.User ? GameEventType.UserTurnSaved : GameEventType.OpponentTurnSaved;
    const lastTurnEvent = this.events.log.findLast(e => e.type === passType || e.type === saveType);
    return lastTurnEvent?.type === passType;
  }

  clearAllEvents(): Array<GameEvent> {
    return this.events.clearAll();
  }
}

class Events {
  private readonly _log: Array<GameEvent> = [];
  private readonly pending: Array<GameEvent> = [];

  get log(): ReadonlyArray<GameEvent> {
    return [...this._log];
  }

  record(event: GameEvent): void {
    this._log.push(event);
    this.pending.push(event);
  }

  clearAll(): Array<GameEvent> {
    const copy = [...this.pending];
    this.pending.length = 0;
    return copy;
  }
}
