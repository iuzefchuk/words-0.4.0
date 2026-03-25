import { Event } from '@/domain/enums.ts';
import Board from '@/domain/models/Board.ts';
import Dictionary from '@/domain/models/Dictionary.ts';
import Inventory from '@/domain/models/Inventory.ts';
import MatchTracker from '@/domain/models/MatchTracker.ts';
import TurnTracker from '@/domain/models/TurnTracker.ts';
import CurrentTurnValidator, { ValidatorContext } from '@/domain/services/CurrentTurnValidator.ts';
import TurnGenerator, { GeneratorContext, GeneratorResult } from '@/domain/services/TurnGenerator.ts';
import {
  GameCell,
  GameTile,
  GamePlayer,
  GameTurnResolutionType,
  GameState,
  GameConfig,
  GameMatchResult,
} from '@/domain/types.ts';
import { IdGenerator } from '@/shared/ports.ts';

export default class Game {
  private static Events = class {
    private readonly events: Array<Event> = [];

    record(event: Event): void {
      this.events.push(event);
    }

    clearAll(): Array<Event> {
      const copy = [...this.events];
      this.events.length = 0;
      return copy;
    }
  };

  private readonly events = new Game.Events();

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

  get config(): GameConfig {
    return {
      boardCells: this.board.cells,
      boardCellsPerAxis: this.board.cellsPerAxis,
    };
  }

  get state(): GameState {
    return {
      unusedTilesCount: this.inventory.unusedTilesCount,
      matchIsFinished: this.matchTracker.matchIsFinished,
      hasPriorTurns: this.turnTracker.hasPriorTurns,
      currentPlayer: this.turnTracker.currentPlayer,
      nextPlayer: this.turnTracker.nextPlayer,
      currentTurnTiles: this.turnTracker.currentTurnTiles,
      currentTurnCells: this.turnTracker.currentTurnCells,
      currentTurnScore: this.turnTracker.currentTurnScore,
      currentTurnWords: this.turnTracker.currentTurnWords,
      currentTurnIsValid: this.turnTracker.currentTurnIsValid,
      previousTurnTiles: this.turnTracker.previousTurnTiles,
      turnResolutionHistory: this.turnTracker.resolutionHistory,
    };
  }

  isCellCenter(cell: GameCell): boolean {
    return this.board.isCellCenter(cell);
  }

  getBonusForCell(cell: GameCell): string | null {
    return this.board.getBonusForCell(cell);
  }

  findTileByCell(cell: GameCell): GameTile | undefined {
    return this.board.findTileByCell(cell);
  }

  findCellByTile(tile: GameTile): GameCell | undefined {
    return this.board.findCellByTile(tile);
  }

  isTilePlaced(tile: GameTile): boolean {
    return this.board.isTilePlaced(tile);
  }

  getRowIndex(cell: GameCell): number {
    return this.board.getRowIndex(cell);
  }

  getColumnIndex(cell: GameCell): number {
    return this.board.getColumnIndex(cell);
  }

  findTopRightCell(cells: ReadonlyArray<GameCell>): GameCell | undefined {
    return this.board.findTopRightCell(cells);
  }

  areTilesEqual(firstTile: GameTile, secondTile: GameTile): boolean {
    return this.inventory.areTilesEqual(firstTile, secondTile);
  }

  getTileLetter(tile: GameTile): string {
    return this.inventory.getTileLetter(tile);
  }

  getTilesFor(player: GamePlayer): ReadonlyArray<GameTile> {
    return this.inventory.getTilesFor(player);
  }

  hasTilesFor(player: GamePlayer): boolean {
    return this.inventory.hasTilesFor(player);
  }

  getMatchResultFor(player: GamePlayer): GameMatchResult | undefined {
    return this.matchTracker.getResultFor(player);
  }

  getScoreFor(player: GamePlayer): number {
    return this.turnTracker.getScoreFor(player);
  }

  willPlayerPassBeResign(player: GamePlayer): boolean {
    return this.turnTracker.willPlayerPassBeResign(player);
  }

  placeTile({ cell, tile }: { cell: GameCell; tile: GameTile }): void {
    this.matchTracker.ensureMutability();
    this.board.placeTile(cell, tile);
    this.turnTracker.placeTileInCurrentTurn(tile);
    this.events.record(Event.TilePlaced);
  }

  undoPlaceTile({ tile }: { tile: GameTile }): void {
    this.matchTracker.ensureMutability();
    this.turnTracker.undoPlaceTileInCurrentTurn({ tile });
    this.board.undoPlaceTile(tile);
    this.events.record(Event.TileUndoPlaced);
  }

  resetCurrentTurn(): void {
    this.matchTracker.ensureMutability();
    for (const tile of this.turnTracker.currentTurnTiles) this.board.undoPlaceTile(tile);
    this.turnTracker.resetCurrentTurn();
  }

  validateCurrentTurn(): void {
    const context = {
      board: this.board,
      dictionary: this.dictionary,
      inventory: this.inventory,
      turnTracker: this.turnTracker,
    } as ValidatorContext;
    const result = CurrentTurnValidator.execute(context);
    this.turnTracker.setCurrentTurnValidation(result);
  }

  saveCurrentTurn(): { words: ReadonlyArray<string> } {
    this.matchTracker.ensureMutability();
    if (!this.state.currentTurnIsValid) throw new Error('Turn is not valid');
    const { currentPlayer: player, currentTurnTiles: tiles, currentTurnWords: words } = this.state;
    if (!words) throw new Error('Current turn words do not exist');
    this.turnTracker.recordCurrentTurnResolution(GameTurnResolutionType.Save);
    tiles.forEach((tile: GameTile) => this.inventory.discardTile({ player, tile }));
    this.inventory.replenishTilesFor(player);
    this.startTurnForNextPlayer();
    const newEvent = player === GamePlayer.User ? Event.UserTurnSaved : Event.OpponentTurnSaved;
    this.events.record(newEvent);
    return { words };
  }

  passCurrentTurn(): void {
    const { currentPlayer: player } = this.state;
    this.matchTracker.ensureMutability();
    this.turnTracker.recordCurrentTurnResolution(GameTurnResolutionType.Pass);
    this.startTurnForNextPlayer();
    const newEvent = player === GamePlayer.User ? Event.UserTurnPassed : Event.OpponentTurnPassed;
    this.events.record(newEvent);
  }

  async *generateTurnFor(player: GamePlayer, yieldControl: () => Promise<void>): AsyncGenerator<GeneratorResult> {
    const context = {
      board: Board.clone(this.board),
      dictionary: this.dictionary,
      inventory: this.inventory,
      turnTracker: this.turnTracker,
      yieldControl,
    } as GeneratorContext;
    yield* TurnGenerator.execute(context, player);
  }

  endMatchByScore(): void {
    const { leaderByScore, loserByScore } = this.turnTracker;
    if (leaderByScore === null || loserByScore === null) {
      this.tieMatch();
      this.events.record(Event.MatchTied);
    } else {
      this.completeMatch(leaderByScore, loserByScore);
      this.events.record(leaderByScore === GamePlayer.User ? Event.MatchWon : Event.MatchLost);
    }
  }

  completeMatch(winner: GamePlayer, loser: GamePlayer): void {
    this.matchTracker.recordCompletion(winner, loser);
  }

  tieMatch(): void {
    this.matchTracker.recordTie(this.state.currentPlayer, this.state.nextPlayer);
  }

  resignMatchForCurrentPlayer(): void {
    const { currentPlayer, nextPlayer } = this.state;
    this.matchTracker.recordCompletion(nextPlayer, currentPlayer);
    this.events.record(currentPlayer === GamePlayer.User ? Event.MatchLost : Event.MatchWon);
  }

  clearAllEvents(): Array<Event> {
    return this.events.clearAll();
  }

  private startTurnForNextPlayer(): void {
    this.turnTracker.createNewTurnFor(this.turnTracker.nextPlayer);
  }
}
