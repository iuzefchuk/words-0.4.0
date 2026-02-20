import { Layout, CellIndex } from '../Layout/Layout.js';
import { Inventory, TileId } from '../Inventory.js';
import { Player } from '../Player.js';
import { TurnStateComputer } from './TurnStateComputer.js';
import { Dictionary } from '../Dictionary/Dictionary.js';

export type Placement = Array<Link>;

export type TurnInput = { initPlacement: Placement };

export type TurnComputeds = {
  sequences: { cell: ReadonlyArray<CellIndex>; tile: ReadonlyArray<TileId> };
  score: number;
  words: ReadonlyArray<string>;
};

export type TurnState =
  | {
      type: TurnStateType.Unvalidated;
    }
  | {
      type: TurnStateType.Invalid;
      error: string;
    }
  | ({
      type: TurnStateType.Valid;
    } & TurnComputeds);

export enum TurnStateType {
  Unvalidated = 'Unvalidated',
  Invalid = 'Invalid',
  Valid = 'Valid',
}

enum PlayerStates {
  Started = 'Started',
  PlayedBySave = 'PlayedBySave',
  PlayedByPass = 'PlayedByPass',
  Won = 'Won',
  Tied = 'Tied',
}

class Link {
  private constructor(
    readonly cell: CellIndex,
    readonly tile: TileId,
  ) {}

  static create(cell: CellIndex, tile: TileId) {
    return new Link(cell, tile);
  }
}

class Turn {
  private constructor(
    private readonly id: string,
    readonly player: Player,
    private initPlacement: Placement,
    private state: TurnState,
  ) {}

  static create({ player }: { player: Player }): Turn {
    return new Turn(crypto.randomUUID(), player, [], { type: TurnStateType.Unvalidated });
  }

  get cellSequence(): ReadonlyArray<CellIndex> | undefined {
    return this.state.type === TurnStateType.Valid ? this.state.sequences.cell : undefined;
  }

  get tileSequence(): ReadonlyArray<TileId> | undefined {
    return this.state.type === TurnStateType.Valid ? this.state.sequences.tile : undefined;
  }

  get error(): string | undefined {
    return this.state.type === TurnStateType.Invalid ? this.state.error : undefined;
  }

  get score(): number | undefined {
    return this.state.type === TurnStateType.Valid ? this.state.score : undefined;
  }

  get words(): ReadonlyArray<string> | undefined {
    return this.state.type === TurnStateType.Valid ? this.state.words : undefined;
  }

  get isValid(): boolean {
    return this.state.type === TurnStateType.Valid;
  }

  computeState(dependencies: {
    layout: Layout;
    dictionary: Dictionary;
    inventory: Inventory;
    turnManager: TurnManager;
  }): void {
    this.state = new TurnStateComputer(dependencies).compute({ initPlacement: this.initPlacement });
  }

  getConnectedTile(cell: CellIndex): TileId | undefined {
    return this.initPlacement.find(link => link.cell === cell)?.tile;
  }

  getConnectedCell(tile: TileId): CellIndex | undefined {
    return this.initPlacement.find(link => link.tile === tile)?.cell;
  }

  connectTileToCell({ cell, tile }: { cell: CellIndex; tile: TileId }): void {
    this.validateCellAndTileAbsence(cell, tile);
    this.initPlacement.push(Link.create(cell, tile));
    this.initPlacement.sort((a, b) => a.cell - b.cell);
  }

  disconnectTileFromCell({ tile }: { tile: TileId }): void {
    const index = this.initPlacement.findIndex(link => link.tile === tile);
    if (index === -1) throw new Error(`Tile ${tile} not found`);
    this.initPlacement.splice(index, 1);
  }

  reset(): void {
    this.initPlacement.length = 0;
  }

  private validateCellAndTileAbsence(cell: CellIndex, tile: TileId): void {
    if (this.initPlacement.some(link => link.cell === cell)) throw new Error(`Cell ${cell} already connected`);
    if (this.initPlacement.some(link => link.tile === tile)) throw new Error(`Tile ${tile} already connected`);
  }
}

class TurnHistory {
  private static readonly startingPlayer: Player = Player.User;

  private constructor(private turns: Array<Turn>) {}

  static create(): TurnHistory {
    return new TurnHistory([]);
  }

  get isEmpty(): boolean {
    return this.turns.length === 0;
  }

  get currentPlayer(): Player {
    return this.currentTurn.player;
  }

  get nextPlayer(): Player {
    if (this.turns.length === 0) return TurnHistory.startingPlayer;
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

  get previousTurnTileSequence(): ReadonlyArray<TileId> | undefined | null {
    return this.previousTurn ? this.previousTurn.tileSequence : null;
  }

  getScoreFor(player: Player): number {
    return this.getTurnsFor(player).reduce((sum, t) => sum + (t.score ?? 0), 0);
  }

  findTileByCell(cell: CellIndex): TileId | undefined {
    for (const turn of this.turns) {
      const tile = turn.getConnectedTile(cell);
      if (tile) return tile;
    }
  }

  findCellByTile(tile: TileId): CellIndex | undefined {
    for (const turn of this.turns) {
      const cell = turn.getConnectedCell(tile);
      if (cell) return cell;
    }
  }

  createNewTurnFor(player: Player): void {
    this.turns.push(Turn.create({ player }));
  }

  private get previousTurn(): Turn | null {
    return this.turns.at(-2) ?? null;
  }

  private getTurnsFor(player: Player): Array<Turn> {
    return this.turns.filter(t => t.player === player);
  }
}

export class TurnManager {
  private static readonly finalPlayerStates = [PlayerStates.Won, PlayerStates.Tied];

  private constructor(
    private readonly history: TurnHistory,
    private playerStates: Map<Player, PlayerStates>,
  ) {}

  static create({ players }: { players: Array<Player> }): TurnManager {
    const playerStates = new Map(players.map(p => [p, PlayerStates.Started]));
    const history = TurnHistory.create();
    const manager = new TurnManager(history, playerStates);
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

  get currentTurnIsSavable(): boolean {
    return this.history.currentTurn.isValid;
  }

  get previousTurnTileSequence(): ReadonlyArray<TileId> | undefined | null {
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
    return this.playerStates.get(player) === PlayerStates.PlayedByPass;
  }

  connectTileToCell({ cell, tile }: { cell: CellIndex; tile: TileId }): void {
    this.checkMutability();
    this.history.currentTurn.connectTileToCell({ cell, tile });
  }

  disconnectTileFromCell({ tile }: { tile: TileId }): void {
    this.checkMutability();
    this.history.currentTurn.disconnectTileFromCell({ tile });
  }

  computeCurrentTurnState(dependencies: { layout: Layout; dictionary: Dictionary; inventory: Inventory }): void {
    this.checkMutability();
    this.history.currentTurn.computeState({ ...dependencies, turnManager: this });
  }

  resetCurrentTurn(): void {
    this.checkMutability();
    this.history.currentTurn.reset();
  }

  saveCurrentTurn(): void {
    this.checkMutability();
    if (!this.currentTurnIsSavable) throw new Error('Turn is not saveable');
    this.setPlayerState(this.history.currentPlayer, PlayerStates.PlayedBySave);
    this.startTurnForNextPlayer();
  }

  passCurrentTurn(): void {
    this.checkMutability();
    this.setPlayerState(this.history.currentPlayer, PlayerStates.PlayedByPass);
    this.startTurnForNextPlayer();
  }

  resignCurrentTurn(): void {
    this.checkMutability();
    const winner = this.history.nextPlayer;
    this.setPlayerState(winner, PlayerStates.Won);
  }

  startTurnForNextPlayer(): void {
    this.checkMutability();
    this.history.createNewTurnFor(this.history.nextPlayer);
  }

  private checkMutability(): void {
    for (const state of this.playerStates.values()) {
      if (TurnManager.finalPlayerStates.includes(state)) throw new Error('Turns are immutable because game is ended');
    }
  }

  private setPlayerState(player: Player, state: PlayerStates): void {
    this.playerStates.set(player, state);
  }
}
