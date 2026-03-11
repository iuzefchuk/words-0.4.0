import { Player } from '@/domain/enums.ts';
import { GameContext } from '@/domain/types.ts';
import TurnValidator from '@/domain/Turnkeeper/TurnValidator.ts';
import { PlayerAction, ValidationStatus } from '@/domain/Turnkeeper/enums.ts';
import { TileId } from '@/domain/Inventory/types/shared.ts';
import { CellIndex } from '@/domain/Layout/types/shared.ts';
import { Placement } from '@/domain/Turnkeeper/types/shared.ts';
import { Link } from '@/domain/Turnkeeper/types/local/index.ts';
import {
  Result as ValidationResult,
  UnvalidatedResult,
} from '@/domain/Turnkeeper/types/local/initialPlacementValidation.ts';

export default class Turnkeeper {
  private static readonly finalActions = [PlayerAction.Won, PlayerAction.Tied];
  private isMutable: boolean = true;

  private constructor(
    private readonly history: History,
    private lastActions: Map<Player, PlayerAction>,
  ) {}

  static create({ players }: { players: Array<Player> }): Turnkeeper {
    const history = History.create();
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

  get previousTurnTileSequence(): ReadonlyArray<TileId> | undefined {
    return this.history.previousTurnTileSequence;
  }

  get historyIsEmpty(): boolean {
    return this.history.isEmpty;
  }

  getScoreFor(player: Player): number {
    return this.history.getScoreFor(player);
  }

  findTileByCell(cell: CellIndex): TileId | undefined {
    return this.history.findTileByCell(cell);
  }

  findCellByTile(tile: TileId): CellIndex | undefined {
    return this.history.findCellByTile(tile);
  }

  isCellConnected(cell: CellIndex): boolean {
    return Boolean(this.findTileByCell(cell));
  }

  isTileConnected(tile: TileId): boolean {
    return Boolean(this.findCellByTile(tile));
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

  validateCurrentTurn(context: GameContext): void {
    this.ensureMutability();
    this.history.currentTurn.validate(context);
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

class History {
  private static readonly firstPlayer: Player = Player.User;

  private constructor(
    private turns: Array<Turn>,
    private readonly cellByTile: Map<CellIndex, TileId>,
    private readonly tileByCell: Map<TileId, CellIndex>,
  ) {}

  static create(): History {
    return new History([], new Map(), new Map());
  }

  get isEmpty(): boolean {
    return this.turns.length === 0;
  }

  get currentPlayer(): Player {
    return this.currentTurn.player;
  }

  get nextPlayer(): Player {
    if (this.turns.length === 0) return History.firstPlayer;
    return this.currentPlayer === Player.User ? Player.Opponent : Player.User;
  }

  get currentTurn(): Turn {
    const last = this.turns.at(-1);
    if (!last) throw new Error('No current turn exists');
    return last;
  }

  get currentTurnCellSequence(): ReadonlyArray<CellIndex> | undefined {
    return this.currentTurn.cellSequence;
  }

  get currentTurnTileSequence(): ReadonlyArray<TileId> | undefined {
    return this.currentTurn.tileSequence;
  }

  get previousTurnTileSequence(): ReadonlyArray<TileId> | undefined {
    return this.turns.at(-2)?.tileSequence;
  }

  getScoreFor(player: Player): number {
    return this.turns.filter(t => t.player === player).reduce((sum, t) => sum + (t.score ?? 0), 0);
  }

  findTileByCell(cell: CellIndex): TileId | undefined {
    return this.cellByTile.get(cell);
  }

  findCellByTile(tile: TileId): CellIndex | undefined {
    return this.tileByCell.get(tile);
  }

  placeTile({ cell, tile }: { cell: CellIndex; tile: TileId }): void {
    this.currentTurn.placeTile({ cell, tile });
    this.cellByTile.set(cell, tile);
    this.tileByCell.set(tile, cell);
  }

  removeTile({ tile }: { tile: TileId }): void {
    const cell = this.tileByCell.get(tile);
    this.currentTurn.removeTile({ tile });
    if (cell !== undefined) {
      this.cellByTile.delete(cell);
      this.tileByCell.delete(tile);
    }
  }

  resetCurrentTurn(): void {
    for (const { cell, tile } of this.currentTurn.links) {
      this.cellByTile.delete(cell);
      this.tileByCell.delete(tile);
    }
    this.currentTurn.reset();
  }

  createNewTurnFor(player: Player): void {
    this.turns.push(Turn.create({ player }));
  }
}

class Turn {
  private constructor(
    readonly player: Player,
    private initialPlacement: Placement,
    private validationResult: ValidationResult,
  ) {}

  static create({ player }: { player: Player }): Turn {
    const initialPlacement: Placement = [];
    const validationResult: UnvalidatedResult = { status: ValidationStatus.Unvalidated };
    return new Turn(player, initialPlacement, validationResult);
  }

  get cellSequence(): ReadonlyArray<CellIndex> | undefined {
    return this.validationResult.status === ValidationStatus.Valid ? this.validationResult.sequences.cell : undefined;
  }

  get tileSequence(): ReadonlyArray<TileId> | undefined {
    return this.validationResult.status === ValidationStatus.Valid ? this.validationResult.sequences.tile : undefined;
  }

  get error(): string | undefined {
    return this.validationResult.status === ValidationStatus.Invalid ? this.validationResult.error : undefined;
  }

  get score(): number | undefined {
    return this.validationResult.status === ValidationStatus.Valid ? this.validationResult.score : undefined;
  }

  get words(): ReadonlyArray<string> | undefined {
    return this.validationResult.status === ValidationStatus.Valid ? this.validationResult.words : undefined;
  }

  get isValid(): boolean {
    return this.validationResult.status === ValidationStatus.Valid;
  }

  get links(): ReadonlyArray<{ cell: CellIndex; tile: TileId }> {
    return this.initialPlacement;
  }

  validate(context: GameContext): void {
    this.validationResult = TurnValidator.execute(context, this.initialPlacement);
  }

  placeTile({ cell, tile }: { cell: CellIndex; tile: TileId }): void {
    this.validateCellAndTileAbsence(cell, tile);
    this.initialPlacement.push({ cell, tile } as Link);
    this.initialPlacement.sort((a, b) => a.cell - b.cell);
  }

  removeTile({ tile }: { tile: TileId }): void {
    const index = this.initialPlacement.findIndex(link => link.tile === tile);
    if (index === -1) throw new Error(`Tile ${tile} not found`);
    this.initialPlacement.splice(index, 1);
  }

  reset(): void {
    this.initialPlacement.length = 0;
    this.validationResult = { status: ValidationStatus.Unvalidated };
  }

  private validateCellAndTileAbsence(cell: CellIndex, tile: TileId): void {
    if (this.initialPlacement.some(link => link.cell === cell)) throw new Error(`Cell ${cell} already connected`);
    if (this.initialPlacement.some(link => link.tile === tile)) throw new Error(`Tile ${tile} already connected`);
  }
}
