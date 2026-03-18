import ActionTracker, { PlayerAction } from '@/domain/models/ActionTracker.ts';
import Board, { CellIndex } from '@/domain/models/Board.ts';
import { Player } from '@/domain/enums.ts';
import { TileId } from '@/domain/models/Inventory.ts';
import TurnHistory, { PlacementLinks, ValidationError, ValidationResult } from '@/domain/models/TurnHistory.ts';
import { IdGenerator } from '@/shared/ports.ts';

export default class TurnDirector {
  private constructor(
    private readonly board: Board,
    private readonly history: TurnHistory,
    private readonly actionTracker: ActionTracker,
  ) {}

  static create({
    players,
    board,
    idGenerator,
  }: {
    players: ReadonlyArray<Player>;
    board: Board;
    idGenerator: IdGenerator;
  }): TurnDirector {
    const history = TurnHistory.create({ idGenerator });
    const actionTracker = ActionTracker.create(players);
    const director = new TurnDirector(board, history, actionTracker);
    director.startTurnForNextPlayer();
    return director;
  }

  static hydrate(data: unknown): TurnDirector {
    const director = Object.setPrototypeOf(data, TurnDirector.prototype) as TurnDirector;
    TurnHistory.hydrate(director.history);
    return director;
  }

  get currentPlayer(): Player {
    return this.history.currentPlayer;
  }

  get currentTurnCellSequence(): ReadonlyArray<CellIndex> | undefined {
    return this.history.currentTurnCellSequence;
  }

  get currentTurnTileSequence(): ReadonlyArray<TileId> | undefined {
    return this.history.currentTurnTileSequence;
  }

  get currentTurnError(): ValidationError | undefined {
    return this.history.currentTurnError;
  }

  get currentTurnScore(): number | undefined {
    return this.history.currentTurnScore;
  }

  get currentTurnWords(): ReadonlyArray<string> | undefined {
    return this.history.currentTurnWords;
  }

  get currentTurnIsValid(): boolean {
    return this.history.currentTurnIsValid;
  }

  get currentTurnPlacementLinks(): PlacementLinks {
    return this.history.currentTurnPlacementLinks;
  }

  get previousTurnTileSequence(): ReadonlyArray<TileId> | undefined {
    return this.history.previousTurnTileSequence;
  }

  get historyHasOpponentTurns(): boolean {
    return this.history.hasOpponentTurns;
  }

  getScoreFor(player: Player): number {
    return this.history.getScoreFor(player);
  }

  hasPlayerPassed(player: Player): boolean {
    return this.actionTracker.hasPlayerPassed(player);
  }

  getLastActionFor(player: Player): PlayerAction | undefined {
    return this.actionTracker.getLastAction(player);
  }

  placeTile({ cell, tile }: { cell: CellIndex; tile: TileId }): void {
    this.history.placeTileInCurrentTurn({ cell, tile });
    this.board.placeTile(cell, tile);
  }

  undoPlaceTile({ tile }: { tile: TileId }): void {
    this.history.undoPlaceTileInCurrentTurn({ tile });
    this.board.undoPlaceTile(tile);
  }

  setCurrentTurnValidation(result: ValidationResult): void {
    this.history.setCurrentTurnValidation(result);
  }

  resetCurrentTurn(): void {
    for (const { tile } of this.history.currentTurnPlacementLinks) {
      this.board.undoPlaceTile(tile);
    }
    this.history.resetCurrentTurn();
  }

  saveCurrentTurn(): void {
    if (!this.currentTurnIsValid) throw new Error('Turn is not valid');
    this.actionTracker.record(this.history.currentPlayer, PlayerAction.Saved);
    this.startTurnForNextPlayer();
  }

  passCurrentTurn(): void {
    this.actionTracker.record(this.history.currentPlayer, PlayerAction.Passed);
    this.startTurnForNextPlayer();
  }

  resignCurrentTurn(): void {
    const loser = this.history.currentPlayer;
    const winner = this.history.nextPlayer;
    this.actionTracker.record(loser, PlayerAction.Lost);
    this.actionTracker.record(winner, PlayerAction.Won);
  }

  endGameByTileDepletion(players: ReadonlyArray<Player>): void {
    const scores = players.map(player => ({ player, score: this.getScoreFor(player) }));
    const maxScore = Math.max(...scores.map(s => s.score));
    const allTied = scores.every(s => s.score === maxScore);
    if (allTied) {
      for (const { player } of scores) this.actionTracker.record(player, PlayerAction.Tied);
    } else {
      for (const { player, score } of scores) {
        this.actionTracker.record(player, score === maxScore ? PlayerAction.Won : PlayerAction.Lost);
      }
    }
  }

  private startTurnForNextPlayer(): void {
    this.history.createNewTurnFor(this.history.nextPlayer);
  }
}
