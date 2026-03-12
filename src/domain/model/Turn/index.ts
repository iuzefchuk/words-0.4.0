import { Player } from '@/domain/enums.ts';
import { PlayerAction } from '@/domain/model/Turn/enums.ts';
import { TileId } from '@/domain/model/Inventory/types.ts';
import { CellIndex } from '@/domain/reference/Layout/types.ts';
import { Placement, ValidationResult } from '@/domain/types.ts';
import { Board } from '@/domain/model/Board/types.ts';
import History from '@/domain/model/Turn/History.ts';

export default class Turnkeeper {
  private static readonly finalActions = [PlayerAction.Won, PlayerAction.Tied];
  private isMutable: boolean = true;

  private constructor(
    private readonly history: History,
    private lastActions: Map<Player, PlayerAction>,
  ) {}

  static create({ players, board }: { players: Array<Player>; board: Board }): Turnkeeper {
    const history = History.create(board);
    const lastActions = new Map(players.map(player => [player, PlayerAction.Joined]));
    const manager = new Turnkeeper(history, lastActions);
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
    return this.lastActions.get(player) === PlayerAction.PlayedByPass;
  }

  placeTile({ cell, tile }: { cell: CellIndex; tile: TileId }): void {
    this.ensureMutability();
    this.history.placeTile({ cell, tile });
  }

  removeTile({ tile }: { tile: TileId }): void {
    this.ensureMutability();
    this.history.removeTile({ tile });
  }

  setCurrentTurnValidation(result: ValidationResult): void {
    this.ensureMutability();
    this.history.currentTurn.setValidation(result);
  }

  resetCurrentTurn(): void {
    this.ensureMutability();
    this.history.resetCurrentTurn();
  }

  saveCurrentTurn(): void {
    this.ensureMutability();
    if (!this.currentTurnIsValid) throw new Error('Turn is not valid');
    this.recordPlayerAction(this.history.currentPlayer, PlayerAction.PlayedBySave);
    this.startTurnForNextPlayer();
  }

  passCurrentTurn(): void {
    this.ensureMutability();
    this.recordPlayerAction(this.history.currentPlayer, PlayerAction.PlayedByPass);
    this.startTurnForNextPlayer();
  }

  resignCurrentTurn(): void {
    this.ensureMutability();
    const winner = this.history.nextPlayer;
    this.recordPlayerAction(winner, PlayerAction.Won);
    this.isMutable = false;
  }

  private startTurnForNextPlayer(): void {
    this.ensureMutability();
    this.history.createNewTurnFor(this.history.nextPlayer);
  }

  private ensureMutability(): void {
    if (!this.isMutable) throw new Error('Turns are immutable');
  }

  private recordPlayerAction(player: Player, move: PlayerAction): void {
    this.lastActions.set(player, move);
  }
}
