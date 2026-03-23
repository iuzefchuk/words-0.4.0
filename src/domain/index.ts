import Board from '@/domain/models/Board.ts';
import Inventory from '@/domain/models/Inventory.ts';
import TurnTracker from '@/domain/models/TurnTracker.ts';
import Dictionary from '@/domain/models/Dictionary.ts';
import { IdGenerator } from '@/shared/ports.ts';
import {
  DomainCell,
  DomainTile,
  DomainPlayer,
  DomainTurnResolution,
  DomainTurnResolutionType,
} from '@/domain/types.ts';
import { Event } from '@/domain/enums.ts';
import TurnValidator, { ValidatorContext } from '@/domain/services/TurnValidator.ts';
import TurnGenerator, { GeneratorResult } from '@/domain/services/TurnGenerator.ts';

export default class Domain {
  private readonly events: Array<Event> = [];

  private constructor(
    private readonly board: Board,
    private readonly dictionary: Dictionary,
    private readonly inventory: Inventory,
    private readonly turnTracker: TurnTracker,
  ) {}

  static create({ dictionary, idGenerator }: { dictionary: Dictionary; idGenerator: IdGenerator }): Domain {
    const board = Board.create();
    const players = Object.values(DomainPlayer);
    const inventory = Inventory.create({ players, idGenerator });
    const tracker = TurnTracker.create({ idGenerator });
    const domain = new Domain(board, dictionary, inventory, tracker);
    domain.startTurnForNextPlayer();
    return domain;
  }

  static hydrate(data: unknown): Domain {
    const domain = Object.setPrototypeOf(data, Domain.prototype) as {
      board: unknown;
      dictionary: unknown;
      inventory: unknown;
      turnTracker: unknown;
    };
    Board.hydrate(domain.board);
    Dictionary.hydrate(domain.dictionary);
    Inventory.hydrate(domain.inventory);
    TurnTracker.hydrate(domain.turnTracker);
    return domain as unknown as Domain;
  }

  get currentPlayer(): DomainPlayer {
    return this.turnTracker.currentPlayer;
  }

  get nextPlayer(): DomainPlayer {
    return this.turnTracker.nextPlayer;
  }

  get currentTurnCells(): ReadonlyArray<DomainCell> | undefined {
    return this.turnTracker.currentTurnCells;
  }

  get currentTurnScore(): number | undefined {
    return this.turnTracker.currentTurnScore;
  }

  get currentTurnWords(): ReadonlyArray<string> | undefined {
    return this.turnTracker.currentTurnWords;
  }

  get currentTurnIsValid(): boolean {
    return this.turnTracker.currentTurnIsValid;
  }

  get currentTurnTiles(): ReadonlyArray<DomainTile> {
    return this.turnTracker.currentTurnTiles;
  }

  get previousTurnTiles(): ReadonlyArray<DomainTile> | undefined {
    return this.turnTracker.previousTurnTiles;
  }

  get hasPriorTurns(): boolean {
    return this.turnTracker.hasPriorTurns;
  }

  get turnResolutionHistory(): ReadonlyArray<DomainTurnResolution> {
    return [...this.turnTracker.resolutionHistory];
  }

  get unusedTilesCount(): number {
    return this.inventory.unusedTilesCount;
  }

  get cells(): ReadonlyArray<DomainCell> {
    return this.board.cells;
  }

  getScoreFor(player: DomainPlayer): number {
    return this.turnTracker.getScoreFor(player);
  }

  drainEvents(): Array<Event> {
    const copy = [...this.events];
    this.events.length = 0;
    return copy;
  }

  placeTile({ cell, tile }: { cell: DomainCell; tile: DomainTile }): void {
    this.board.placeTile(cell, tile);
    this.turnTracker.placeTileInCurrentTurn(tile);
    this.events.push(Event.TilePlaced);
  }

  undoPlaceTile({ tile }: { tile: DomainTile }): void {
    this.turnTracker.undoPlaceTileInCurrentTurn({ tile });
    this.board.undoPlaceTile(tile);
    this.events.push(Event.TileUndoPlaced);
  }

  validateCurrentTurn(): void {
    const result = TurnValidator.execute(
      {
        board: this.board,
        dictionary: this.dictionary,
        inventory: this.inventory,
        turnTracker: this.turnTracker,
      } as ValidatorContext,
      this.currentTurnTiles,
    );
    this.turnTracker.setCurrentTurnValidation(result);
  }

  resetCurrentTurn(): void {
    for (const tile of this.turnTracker.currentTurnTiles) this.board.undoPlaceTile(tile);
    this.turnTracker.resetCurrentTurn();
  }

  saveCurrentTurn(): { words: ReadonlyArray<string> } {
    if (!this.currentTurnIsValid) throw new Error('Turn is not valid');
    const player = this.currentPlayer;
    const tiles = this.currentTurnTiles;
    const words = this.currentTurnWords;
    if (!words) throw new Error('Current turn words do not exist');
    this.turnTracker.recordCurrentTurnResolution(DomainTurnResolutionType.Save);
    tiles.forEach((tile: DomainTile) => this.inventory.discardTile({ player, tile }));
    this.inventory.replenishTilesFor(player);
    this.startTurnForNextPlayer();
    this.events.push(Event.TurnSaved);
    return { words };
  }

  passCurrentTurn(): void {
    this.turnTracker.recordCurrentTurnResolution(DomainTurnResolutionType.Pass);
    this.startTurnForNextPlayer();
    this.events.push(Event.TurnPassed);
  }

  willPlayerPassBeResign(player: DomainPlayer): boolean {
    return this.turnTracker.willPlayerPassBeResign(player);
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

  shuffleTilesFor(player: DomainPlayer): void {
    this.inventory.shuffleTilesFor(player);
  }

  *generateTurnFor(player: DomainPlayer): Generator<GeneratorResult> {
    const context = {
      board: this.board,
      dictionary: this.dictionary,
      inventory: this.inventory,
      turnTracker: this.turnTracker,
    };
    yield* TurnGenerator.execute(context, player);
  }

  private startTurnForNextPlayer(): void {
    this.turnTracker.createNewTurnFor(this.turnTracker.nextPlayer);
  }
}
