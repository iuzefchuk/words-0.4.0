import { Event } from '@/domain/enums.ts';
import Board from '@/domain/models/Board.ts';
import Dictionary from '@/domain/models/Dictionary.ts';
import Inventory from '@/domain/models/Inventory.ts';
import MatchTracker from '@/domain/models/MatchTracker.ts';
import TurnTracker from '@/domain/models/TurnTracker.ts';
import TurnGenerator, { GeneratorContext, GeneratorResult } from '@/domain/services/TurnGenerator.ts';
import TurnValidator, { ValidatorContext } from '@/domain/services/TurnValidator.ts';
import {
  DomainCell,
  DomainTile,
  DomainPlayer,
  DomainTurnResolutionType,
  DomainState,
  DomainConfig,
  DomainMatchResult,
} from '@/domain/types.ts';
import { IdGenerator } from '@/shared/ports.ts';

export default class Domain {
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

  private readonly events = new Domain.Events();

  private constructor(
    private readonly board: Board,
    private readonly dictionary: Dictionary,
    private readonly inventory: Inventory,
    private readonly matchTracker: MatchTracker,
    private readonly turnTracker: TurnTracker,
  ) {}

  static create(dictionary: Dictionary, idGenerator: IdGenerator): Domain {
    const board = Board.create();
    const players = Object.values(DomainPlayer);
    const inventory = Inventory.create(players, idGenerator);
    const matchTracker = MatchTracker.create(players);
    const turnTracker = TurnTracker.create(idGenerator);
    const domain = new Domain(board, dictionary, inventory, matchTracker, turnTracker);
    domain.startTurnForNextPlayer();
    return domain;
  }

  static reconstruct(data: unknown): Domain {
    const domain = Object.setPrototypeOf(data, Domain.prototype) as {
      board: unknown;
      dictionary: unknown;
      inventory: unknown;
      turnTracker: unknown;
    };
    Board.reconstruct(domain.board);
    Dictionary.reconstruct(domain.dictionary);
    Inventory.reconstruct(domain.inventory);
    TurnTracker.reconstruct(domain.turnTracker);
    return domain as unknown as Domain;
  }

  get config(): DomainConfig {
    return {
      boardCells: this.board.cells,
    };
  }

  get state(): DomainState {
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

  isCellCenter(cell: DomainCell): boolean {
    return this.board.isCellCenter(cell);
  }

  getBonusForCell(cell: DomainCell): string | null {
    return this.board.getBonusForCell(cell);
  }

  findTileByCell(cell: DomainCell): DomainTile | undefined {
    return this.board.findTileByCell(cell);
  }

  findCellByTile(tile: DomainTile): DomainCell | undefined {
    return this.board.findCellByTile(tile);
  }

  isTilePlaced(tile: DomainTile): boolean {
    return this.board.isTilePlaced(tile);
  }

  getRowIndex(cell: DomainCell): number {
    return this.board.getRowIndex(cell);
  }

  getColumnIndex(cell: DomainCell): number {
    return this.board.getColumnIndex(cell);
  }

  findTopRightCell(cells: ReadonlyArray<DomainCell>): DomainCell | undefined {
    return this.board.findTopRightCell(cells);
  }

  areTilesEqual(firstTile: DomainTile, secondTile: DomainTile): boolean {
    return this.inventory.areTilesEqual(firstTile, secondTile);
  }

  getTileLetter(tile: DomainTile): string {
    return this.inventory.getTileLetter(tile);
  }

  getTilesFor(player: DomainPlayer): ReadonlyArray<DomainTile> {
    return this.inventory.getTilesFor(player);
  }

  hasTilesFor(player: DomainPlayer): boolean {
    return this.inventory.hasTilesFor(player);
  }

  getMatchResultFor(player: DomainPlayer): DomainMatchResult | undefined {
    return this.matchTracker.getResultFor(player);
  }

  getScoreFor(player: DomainPlayer): number {
    return this.turnTracker.getScoreFor(player);
  }

  willPlayerPassBeResign(player: DomainPlayer): boolean {
    return this.turnTracker.willPlayerPassBeResign(player);
  }

  placeTile({ cell, tile }: { cell: DomainCell; tile: DomainTile }): void {
    this.matchTracker.ensureMutability();
    this.board.placeTile(cell, tile);
    this.turnTracker.placeTileInCurrentTurn(tile);
    this.events.record(Event.TilePlaced);
  }

  undoPlaceTile({ tile }: { tile: DomainTile }): void {
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
    const result = TurnValidator.execute(context, this.state.currentTurnTiles);
    this.turnTracker.setCurrentTurnValidation(result);
  }

  saveCurrentTurn(): { words: ReadonlyArray<string> } {
    this.matchTracker.ensureMutability();
    if (!this.state.currentTurnIsValid) throw new Error('Turn is not valid');
    const { currentPlayer: player, currentTurnTiles: tiles, currentTurnWords: words } = this.state;
    if (!words) throw new Error('Current turn words do not exist');
    this.turnTracker.recordCurrentTurnResolution(DomainTurnResolutionType.Save);
    tiles.forEach((tile: DomainTile) => this.inventory.discardTile({ player, tile }));
    this.inventory.replenishTilesFor(player);
    this.startTurnForNextPlayer();
    const newEvent = player === DomainPlayer.User ? Event.UserTurnSaved : Event.OpponentTurnSaved;
    this.events.record(newEvent);
    return { words };
  }

  passCurrentTurn(): void {
    const { currentPlayer: player } = this.state;
    this.matchTracker.ensureMutability();
    this.turnTracker.recordCurrentTurnResolution(DomainTurnResolutionType.Pass);
    this.startTurnForNextPlayer();
    const newEvent = player === DomainPlayer.User ? Event.UserTurnPassed : Event.OpponentTurnPassed;
    this.events.record(newEvent);
  }

  *generateTurnFor(player: DomainPlayer): Generator<GeneratorResult> {
    const context = {
      board: this.board,
      dictionary: this.dictionary,
      inventory: this.inventory,
      turnTracker: this.turnTracker,
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
      this.events.record(leaderByScore === DomainPlayer.User ? Event.MatchWon : Event.MatchLost);
    }
  }

  completeMatch(winner: DomainPlayer, loser: DomainPlayer): void {
    this.matchTracker.recordCompletion(winner, loser);
  }

  tieMatch(): void {
    this.matchTracker.recordTie(this.state.currentPlayer, this.state.nextPlayer);
  }

  resignMatchForCurrentPlayer(): void {
    this.matchTracker.recordCompletion(this.state.nextPlayer, this.state.currentPlayer);
  }

  clearAllEvents(): Array<Event> {
    return this.events.clearAll();
  }

  private startTurnForNextPlayer(): void {
    this.turnTracker.createNewTurnFor(this.turnTracker.nextPlayer);
  }
}
