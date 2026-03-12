import { Player } from '@/domain/enums.ts';
import { PlayerAction } from '@/domain/model/Turn/enums.ts';
import { TileId } from '@/domain/model/Inventory/types.ts';
import { CellIndex } from '@/domain/reference/Layout/types.ts';
import { Placement, ValidationResult } from '@/domain/types.ts';
import { Board } from '@/domain/model/Board/types.ts';
import History from '@/domain/model/Turn/History.ts';
import ActionTracker from '@/domain/model/Turn/ActionTracker.ts';

export default class Turnkeeper {
  private constructor(
    private readonly history: History,
    private readonly actionTracker: ActionTracker,
  ) {}

  static create({ players, board }: { players: Array<Player>; board: Board }): Turnkeeper {
    const history = History.create(board);
    const actionTracker = ActionTracker.create(players);
    const manager = new Turnkeeper(history, actionTracker);
    manager.startTurnForNextPlayer();
    return manager;
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

  get currentTurnScore(): number | undefined {
    return this.history.currentTurn.score;
  }

  get currentTurnIsValid(): boolean {
    return this.history.currentTurn.isValid;
  }

  get currentTurnPlacement(): Placement {
    return this.history.currentTurn.placement;
  }

  get previousTurnTileSequence(): ReadonlyArray<TileId> | undefined {
    return this.history.previousTurnTileSequence;
  }

  get historyIsEmpty(): boolean {
    return this.history.isEmpty;
  }

  getScoreFor(player: Player): number {
    return this.history.getScoreFor(player);
  }

  hasPlayerPassed(player: Player): boolean {
    return this.actionTracker.hasPlayerPassed(player);
  }

  placeTile({ cell, tile }: { cell: CellIndex; tile: TileId }): void {
    this.history.placeTile({ cell, tile });
  }

  removeTile({ tile }: { tile: TileId }): void {
    this.history.removeTile({ tile });
  }

  setCurrentTurnValidation(result: ValidationResult): void {
    this.history.currentTurn.setValidation(result);
  }

  resetCurrentTurn(): void {
    this.history.resetCurrentTurn();
  }

  saveCurrentTurn(): void {
    if (!this.currentTurnIsValid) throw new Error('Turn is not valid');
    this.actionTracker.record(this.history.currentPlayer, PlayerAction.PlayedBySave);
    this.startTurnForNextPlayer();
  }

  passCurrentTurn(): void {
    this.actionTracker.record(this.history.currentPlayer, PlayerAction.PlayedByPass);
    this.startTurnForNextPlayer();
  }

  resignCurrentTurn(): void {
    const winner = this.history.nextPlayer;
    this.actionTracker.record(winner, PlayerAction.Won);
  }

  private startTurnForNextPlayer(): void {
    this.history.createNewTurnFor(this.history.nextPlayer);
  }
}
