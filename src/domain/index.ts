import { Player, Bonus, Letter } from '@/domain/enums.ts';
import { GameContext } from '@/domain/types.ts';
import Dictionary from '@/domain/Dictionary/index.ts';
import Inventory from '@/domain/Inventory/index.ts';
import Layout from '@/domain/Layout/index.ts';
import Turnkeeper from '@/domain/Turnkeeper/index.ts';
import TurnGenerator from '@/domain/Turnkeeper/TurnGenerator.ts';
import { TileId } from '@/domain/Inventory/types/shared.ts';
import { CellIndex } from '@/domain/Layout/types/shared.ts';
import { Placement } from '@/domain/Turnkeeper/types/shared.ts';

export default class GameDomain {
  private static readonly layout = Layout.create();
  private static readonly dictionary = Dictionary.create();
  private isMutable: boolean = true;

  private constructor(
    private inventory: Inventory,
    private turnkeeper: Turnkeeper,
  ) {}

  static create(): GameDomain {
    const players = Object.values(Player);
    const inventory = Inventory.create({ players });
    const turnkeeper = Turnkeeper.create({ players });
    return new GameDomain(inventory, turnkeeper);
  }

  private get context(): GameContext {
    return {
      layout: GameDomain.layout,
      dictionary: GameDomain.dictionary,
      inventory: this.inventory,
      turnkeeper: this.turnkeeper,
    };
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
    return this.turnkeeper.currentTurnScore;
  }

  get currentTurnIsSavable() {
    return this.turnkeeper.currentTurnIsSavable;
  }

  get currentPlayerIsUser(): boolean {
    return this.turnkeeper.currentPlayer === Player.User;
  }

  get userPassWillBeResign(): boolean {
    return this.turnkeeper.hasPlayerPassed(Player.User);
  }

  isCellInCenterOfLayout(cell: CellIndex): boolean {
    return GameDomain.layout.isCellCenter(cell);
  }

  getCellBonus(cell: CellIndex): Bonus | null {
    return GameDomain.layout.getBonusForCell(cell);
  }

  getScoreFor(player: Player): number {
    return this.turnkeeper.getScoreFor(player);
  }

  findTileByCell(cell: CellIndex): TileId | undefined {
    return this.turnkeeper.findTileByCell(cell);
  }

  findCellByTile(tile: TileId): CellIndex | undefined {
    return this.turnkeeper.findCellByTile(tile);
  }

  isTileConnected(tile: TileId): boolean {
    return this.turnkeeper.isTileConnected(tile);
  }

  areTilesSame(firstTile: TileId, secondTile: TileId): boolean {
    return this.inventory.areTilesEqual(firstTile, secondTile);
  }

  getTileLetter(tile: TileId): Letter {
    return this.inventory.getTileLetter(tile);
  }

  isCellLastConnectionInTurn(cell: CellIndex): boolean {
    return this.turnkeeper.currentTurnCellSequence?.at(-1) === cell;
  }

  wasTileUsedInPreviousTurn(tile: TileId): boolean {
    const { previousTurnTileSequence } = this.turnkeeper;
    if (!previousTurnTileSequence) return false;
    return previousTurnTileSequence.includes(tile);
  }

  shuffleUserTiles(): void {
    this.checkMutability();
    this.inventory.shuffleTilesFor(Player.User);
  }

  connectTileToCell({ cell, tile }: { cell: CellIndex; tile: TileId }): void {
    this.checkMutability();
    this.turnkeeper.connectTileToCell({ cell, tile });
  }

  disconnectTileFromCell(tile: TileId): void {
    this.checkMutability();
    this.turnkeeper.disconnectTileFromCell({ tile });
  }

  validateTurn(): void {
    this.checkMutability();
    this.turnkeeper.validateCurrentTurn(this.context);
  }

  resetTurn(): void {
    this.checkMutability();
    this.turnkeeper.resetCurrentTurn();
  }

  saveTurn(): void {
    this.checkMutability();
    const { currentPlayer, currentTurnTileSequence } = this.turnkeeper;
    if (!currentTurnTileSequence) throw new Error('Current turn must be computed before save');
    this.turnkeeper.saveCurrentTurn();
    this.removeTiles({ player: currentPlayer, tiles: currentTurnTileSequence });
    this.inventory.replenishTilesFor(currentPlayer);
    this.turnkeeper.startTurnForNextPlayer();
  }

  passTurn(): void {
    this.checkMutability();
    this.turnkeeper.passCurrentTurn();
    this.turnkeeper.startTurnForNextPlayer();
  }

  resignGame(): void {
    this.checkMutability();
    this.turnkeeper.resignCurrentTurn();
    this.finishGame();
  }

  generatePlacement({ player }: { player: Player }): Placement | null {
    const generator = new TurnGenerator(this.context);
    for (const placement of generator.execute(player)) return placement;
    return null;
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
