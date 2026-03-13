import ActionTracker, { PlayerAction } from '@/domain/models/ActionTracker.ts';
import { Board, CellIndex } from '@/domain/models/Board.ts';
import { Player } from '@/domain/enums.ts';
import { TileId } from '@/domain/models/Inventory.ts';
import TurnHistory, { Placement, ValidationResult } from '@/domain/models/TurnHistory.ts';

export default class TurnDirector {
  private constructor(
    private readonly board: Board,
    private readonly history: TurnHistory,
    private readonly actionTracker: ActionTracker,
  ) {}

  static create({ players, board }: { players: Array<Player>; board: Board }): TurnDirector {
    const history = TurnHistory.create();
    const actionTracker = ActionTracker.create(players);
    const director = new TurnDirector(board, history, actionTracker);
    director.startTurnForNextPlayer();
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
    this.history.currentTurn.placeTile({ cell, tile });
    this.board.placeTile(cell, tile);
  }

  undoPlaceTile({ tile }: { tile: TileId }): void {
    this.history.currentTurn.undoPlaceTile({ tile });
    this.board.undoPlaceTile(tile);
  }

  setCurrentTurnValidation(result: ValidationResult): void {
    this.history.currentTurn.setValidationResult(result);
  }

  resetCurrentTurn(): void {
    for (const { tile } of this.history.currentTurn.placement) {
      this.board.undoPlaceTile(tile);
    }
    this.history.currentTurn.reset();
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
    const winner = this.history.nextPlayer;
    this.actionTracker.record(winner, PlayerAction.Won);
  }

  private startTurnForNextPlayer(): void {
    this.history.createNewTurnFor(this.history.nextPlayer);
  }
}
