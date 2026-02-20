import { Layout, CellIndex, Bonus } from './Layout/Layout.js';
import { Inventory, TileId, Letter } from './Inventory.js';
import { Player } from './Player.js';
import { TurnInput, TurnManager } from './Turn/Turn.js';
import { TurnInputGenerator } from './Turn/TurnInputGenerator.js';
import { Dictionary } from './Dictionary/Dictionary.js';

export class GameDomain {
  private isMutable: boolean = true;
  private static readonly layout = Layout.create();
  private static readonly dictionary = Dictionary.create();

  private constructor(
    private readonly id: string,
    private inventory: Inventory,
    private turnManager: TurnManager,
  ) {}

  static create(): GameDomain {
    const id = crypto.randomUUID();
    const players = Object.values(Player);
    const inventory = Inventory.create({ players });
    const turnManager = TurnManager.create({ players });
    return new GameDomain(id, inventory, turnManager);
  }

  get isFinished(): boolean {
    return !this.isMutable;
  }

  get layoutCells(): ReadonlyArray<CellIndex> {
    return GameDomain.layout.cells;
  }

  get tilesRemaining(): number {
    return this.inventory.unusedTilesCount;
  }

  get userTiles(): ReadonlyArray<TileId> {
    return this.inventory.getTilesFor(Player.User);
  }

  get currentTurnScore(): number | undefined {
    return this.turnManager.currentTurnScore;
  }

  get currentTurnIsSavable() {
    return this.turnManager.currentTurnIsSavable;
  }

  get currentPlayerIsUser(): boolean {
    return this.turnManager.currentPlayer === Player.User;
  }

  get userPassWillBeResign(): boolean {
    return this.turnManager.hasPlayerPassed(Player.User);
  }

  isCellInCenterOfLayout(cell: CellIndex): boolean {
    return GameDomain.layout.isCellCenter(cell);
  }

  getCellBonus(cell: CellIndex): Bonus | null {
    return GameDomain.layout.getBonusForCell(cell);
  }

  getScoreFor(player: Player): number {
    return this.turnManager.getScoreFor(player);
  }

  findTileByCell(cell: CellIndex): TileId | undefined {
    return this.turnManager.findTileByCell(cell);
  }

  findCellByTile(tile: TileId): CellIndex | undefined {
    return this.turnManager.findCellByTile(tile);
  }

  isTileConnected(tile: TileId): boolean {
    return this.turnManager.isTileConnected(tile);
  }

  areTilesSame(firstTile: TileId, secondTile: TileId): boolean {
    return this.inventory.areTilesEqual(firstTile, secondTile);
  }

  getTileLetter(tile: TileId): Letter {
    return this.inventory.getTileLetter(tile);
  }

  isCellLastConnectionInTurn(cell: CellIndex): boolean {
    return this.turnManager.currentTurnCellSequence?.at(-1) === cell;
  }

  wasTileUsedInPreviousTurn(tile: TileId): boolean {
    const { previousTurnTileSequence } = this.turnManager;
    if (!previousTurnTileSequence) return false;
    return previousTurnTileSequence.includes(tile);
  }

  shuffleUserTiles(): void {
    this.checkMutability();
    this.inventory.shuffleTilesFor(Player.User);
  }

  connectTileToCell({ cell, tile }: { cell: CellIndex; tile: TileId }): void {
    this.checkMutability();
    this.turnManager.connectTileToCell({ cell, tile });
  }

  disconnectTileFromCell(tile: TileId): void {
    this.checkMutability();
    this.turnManager.disconnectTileFromCell({ tile });
  }

  computeTurnState(): void {
    this.checkMutability();
    this.turnManager.computeCurrentTurnState({
      layout: GameDomain.layout,
      dictionary: GameDomain.dictionary,
      inventory: this.inventory,
    });
  }

  resetTurn(): void {
    this.checkMutability();
    this.turnManager.resetCurrentTurn();
  }

  saveTurn(): void {
    this.checkMutability();
    this.turnManager.saveCurrentTurn();
    const { currentTurnTileSequence } = this.turnManager;
    if (!currentTurnTileSequence) throw new Error('Current turn must be computed before save');
    this.removeTiles({ player: this.turnManager.currentPlayer, tiles: currentTurnTileSequence });
    this.inventory.replenishTilesFor(this.turnManager.currentPlayer);
    this.turnManager.startTurnForNextPlayer();
  }

  passTurn(): void {
    this.checkMutability();
    this.turnManager.passCurrentTurn();
    this.inventory.replenishTilesFor(this.turnManager.currentPlayer);
    this.turnManager.startTurnForNextPlayer();
  }

  resignGame(): void {
    this.checkMutability();
    this.turnManager.resignCurrentTurn();
    this.finishGame();
  }

  generateTurnInput({ player }: { player: Player }): TurnInput | null {
    return new TurnInputGenerator(GameDomain.layout, this.turnManager).generate({
      playerTiles: this.inventory.getTilesFor(player),
    });
  }

  private finishGame(): void {
    this.isMutable = false;
  }

  private removeTiles({ player, tiles }: { player: Player; tiles: ReadonlyArray<TileId> }): void {
    tiles.forEach((tile: TileId) => this.inventory.removeTile({ player, tileId: tile }));
  }

  private checkMutability(): void {
    if (!this.isMutable) throw new Error('Game is immutable');
  }
}
