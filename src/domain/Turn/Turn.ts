import { Dictionary } from '../Dictionary/Dictionary.js';
import { TileId, Inventory } from '../Inventory/Inventory.js';
import { CellIndex, Layout } from '../Layout/Layout.js';
import { Player } from '../Player.js';
import { StateComputer } from './services/StateComputer.js';

export type Placement = Array<Link>;

export type State = StateUnvalidated | StateInvalid | StateValid;
type StateUnvalidated = { type: StateType.Unvalidated };
type StateInvalid = { type: StateType.Invalid; error: string };
type StateValid = { type: StateType.Valid } & StateComputeds;
type StateComputeds = {
  sequences: { cell: ReadonlyArray<CellIndex>; tile: ReadonlyArray<TileId> };
  score: number;
  words: ReadonlyArray<string>;
};

export enum StateType {
  Unvalidated = 'Unvalidated',
  Invalid = 'Invalid',
  Valid = 'Valid',
}

enum PlayerMove {
  StartedGame = 'StartedGame',
  PlayedBySave = 'PlayedBySave',
  PlayedByPass = 'PlayedByPass',
  Won = 'Won',
  Tied = 'Tied',
}

export class TurnManager {
  private static readonly finalMoves = [PlayerMove.Won, PlayerMove.Tied];

  private constructor(
    private readonly history: TurnHistory,
    private lastMoves: Map<Player, PlayerMove>,
  ) {}

  static create({ players }: { players: Array<Player> }): TurnManager {
    const history = TurnHistory.create();
    const lastMoves = new Map(players.map(player => [player, PlayerMove.StartedGame]));
    const manager = new TurnManager(history, lastMoves);
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
    return this.lastMoves.get(player) === PlayerMove.PlayedByPass;
  }

  connectTileToCell({ cell, tile }: { cell: CellIndex; tile: TileId }): void {
    this.checkMutability();
    this.history.currentTurn.connectTileToCell({ cell, tile });
  }

  disconnectTileFromCell({ tile }: { tile: TileId }): void {
    this.checkMutability();
    this.history.currentTurn.disconnectTileFromCell({ tile });
  }

  computeCurrentTurnState(layout: Layout, dictionary: Dictionary, inventory: Inventory): void {
    this.checkMutability();
    this.history.currentTurn.computeState(layout, dictionary, inventory, this);
  }

  resetCurrentTurn(): void {
    this.checkMutability();
    this.history.currentTurn.reset();
  }

  saveCurrentTurn(): void {
    this.checkMutability();
    if (!this.currentTurnIsSavable) throw new Error('Turn is not saveable');
    this.logPlayerLastMove(this.history.currentPlayer, PlayerMove.PlayedBySave);
    this.startTurnForNextPlayer();
  }

  passCurrentTurn(): void {
    this.checkMutability();
    this.logPlayerLastMove(this.history.currentPlayer, PlayerMove.PlayedByPass);
    this.startTurnForNextPlayer();
  }

  resignCurrentTurn(): void {
    this.checkMutability();
    const winner = this.history.nextPlayer;
    this.logPlayerLastMove(winner, PlayerMove.Won);
  }

  startTurnForNextPlayer(): void {
    this.checkMutability();
    this.history.createNewTurnFor(this.history.nextPlayer);
  }

  private checkMutability(): void {
    for (const move of this.lastMoves.values()) {
      if (TurnManager.finalMoves.includes(move)) throw new Error('Turns are immutable because game is ended');
    }
  }

  private logPlayerLastMove(player: Player, move: PlayerMove): void {
    this.lastMoves.set(player, move);
  }
}

class TurnHistory {
  private static readonly startingPlayer: Player = Player.User;

  private constructor(private turns: Array<Turn>) {}

  static create(): TurnHistory {
    const turns: Array<Turn> = [];
    return new TurnHistory(turns);
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
  get previousTurnTileSequence(): ReadonlyArray<TileId> | undefined {
    return this.previousTurn?.tileSequence;
  }
  private get previousTurn(): Turn | undefined {
    return this.turns.at(-2) ?? undefined;
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

  private getTurnsFor(player: Player): Array<Turn> {
    return this.turns.filter(t => t.player === player);
  }
}

class Turn {
  private constructor(
    readonly player: Player,
    private initialPlacement: Placement,
    private state: State,
  ) {}

  static create({ player }: { player: Player }): Turn {
    const initialPlacement: Placement = [];
    const state: StateUnvalidated = { type: StateType.Unvalidated };
    return new Turn(player, initialPlacement, state);
  }

  get cellSequence(): ReadonlyArray<CellIndex> | undefined {
    return this.state.type === StateType.Valid ? this.state.sequences.cell : undefined;
  }
  get tileSequence(): ReadonlyArray<TileId> | undefined {
    return this.state.type === StateType.Valid ? this.state.sequences.tile : undefined;
  }
  get error(): string | undefined {
    return this.state.type === StateType.Invalid ? this.state.error : undefined;
  }
  get score(): number | undefined {
    return this.state.type === StateType.Valid ? this.state.score : undefined;
  }
  get words(): ReadonlyArray<string> | undefined {
    return this.state.type === StateType.Valid ? this.state.words : undefined;
  }
  get isValid(): boolean {
    return this.state.type === StateType.Valid;
  }

  computeState(layout: Layout, dictionary: Dictionary, inventory: Inventory, turnManager: TurnManager): void {
    this.state = StateComputer.execute(this.initialPlacement, layout, dictionary, inventory, turnManager);
  }

  getConnectedTile(cell: CellIndex): TileId | undefined {
    return this.initialPlacement.find(link => link.cell === cell)?.tile;
  }

  getConnectedCell(tile: TileId): CellIndex | undefined {
    return this.initialPlacement.find(link => link.tile === tile)?.cell;
  }

  connectTileToCell({ cell, tile }: { cell: CellIndex; tile: TileId }): void {
    this.validateCellAndTileAbsence(cell, tile);
    this.initialPlacement.push(Link.create(cell, tile));
    this.initialPlacement.sort((a, b) => a.cell - b.cell);
  }

  disconnectTileFromCell({ tile }: { tile: TileId }): void {
    const index = this.initialPlacement.findIndex(link => link.tile === tile);
    if (index === -1) throw new Error(`Tile ${tile} not found`);
    this.initialPlacement.splice(index, 1);
  }

  reset(): void {
    this.initialPlacement.length = 0;
  }

  private validateCellAndTileAbsence(cell: CellIndex, tile: TileId): void {
    if (this.initialPlacement.some(link => link.cell === cell)) throw new Error(`Cell ${cell} already connected`);
    if (this.initialPlacement.some(link => link.tile === tile)) throw new Error(`Tile ${tile} already connected`);
  }
}

class Link {
  private constructor(
    readonly cell: CellIndex,
    readonly tile: TileId,
  ) {}

  static create(cell: CellIndex, tile: TileId): Link {
    return new Link(cell, tile);
  }
}
