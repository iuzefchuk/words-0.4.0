import { Player, Bonus, Letter } from '@/domain/enums.ts';
import { GameContext, Placement } from '@/domain/types.ts';
import Board from '@/domain/Board/index.ts';
import Dictionary from '@/domain/Dictionary/index.ts';
import Layout from '@/domain/Board/Layout.ts';
import Inventory from '@/domain/Inventory/index.ts';
import Turnkeeper from '@/domain/Turn/index.ts';
import TurnValidator from '@/domain/Validation/index.ts';
import TurnGenerator from '@/domain/Generation/index.ts';
import { TileId } from '@/domain/Inventory/types.ts';
import { CellIndex } from '@/domain/Board/types.ts';

export default class GameDomain {
  private static readonly layout = Layout.create();
  private static readonly dictionary = Dictionary.create();
  private isMutable: boolean = true;

  private constructor(
    private board: Board,
    private inventory: Inventory,
    private turnkeeper: Turnkeeper,
  ) {}

  static create(): GameDomain {
    const players = Object.values(Player);
    const board = Board.create(GameDomain.layout);
    const inventory = Inventory.create({ players });
    const turnkeeper = Turnkeeper.create({ players, board });
    return new GameDomain(board, inventory, turnkeeper);
  }

  private get context(): GameContext {
    return {
      board: this.board,
      dictionary: GameDomain.dictionary,
      inventory: this.inventory,
      turnkeeper: this.turnkeeper,
    };
  }

  get isFinished(): boolean {
    return !this.isMutable;
  }

  get layoutCells(): ReadonlyArray<CellIndex> {
    return this.board.cells;
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

  get currentTurnIsValid() {
    return this.turnkeeper.currentTurnIsValid;
  }

  get currentPlayerIsUser(): boolean {
    return this.turnkeeper.currentPlayer === Player.User;
  }

  get userPassWillBeResign(): boolean {
    return this.turnkeeper.hasPlayerPassed(Player.User);
  }

  isCellInCenterOfLayout(cell: CellIndex): boolean {
    return this.board.isCellCenter(cell);
  }

  getCellBonus(cell: CellIndex): Bonus | null {
    return this.board.getBonusForCell(cell);
  }

  getScoreFor(player: Player): number {
    return this.turnkeeper.getScoreFor(player);
  }

  findTileByCell(cell: CellIndex): TileId | undefined {
    return this.board.findTileByCell(cell);
  }

  findCellByTile(tile: TileId): CellIndex | undefined {
    return this.board.findCellByTile(tile);
  }

  isTileConnected(tile: TileId): boolean {
    return this.board.isTileConnected(tile);
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
    this.ensureMutability();
    this.inventory.shuffleTilesFor(Player.User);
  }

  placeTile({ cell, tile }: { cell: CellIndex; tile: TileId }): void {
    this.ensureMutability();
    this.turnkeeper.placeTile({ cell, tile });
  }

  removeTile(tile: TileId): void {
    this.ensureMutability();
    this.turnkeeper.removeTile({ tile });
  }

  validateTurn(): void {
    this.ensureMutability();
    const result = TurnValidator.execute(this.context, this.turnkeeper.currentTurnPlacement);
    this.turnkeeper.setCurrentTurnValidation(result);
  }

  resetTurn(): void {
    this.ensureMutability();
    this.turnkeeper.resetCurrentTurn();
  }

  saveTurn(): void {
    this.ensureMutability();
    const { currentPlayer, currentTurnTileSequence } = this.turnkeeper;
    if (!currentTurnTileSequence) throw new Error('Current turn tile sequence does not exist');
    this.turnkeeper.saveCurrentTurn();
    this.discardTiles({ player: currentPlayer, tiles: currentTurnTileSequence });
    this.inventory.replenishTilesFor(currentPlayer);
  }

  passTurn(): void {
    this.ensureMutability();
    this.turnkeeper.passCurrentTurn();
  }

  resignGame(): void {
    this.ensureMutability();
    this.turnkeeper.resignCurrentTurn();
    this.finishGame();
  }

  generatePlacement({ player }: { player: Player }): Placement | null {
    for (const placement of TurnGenerator.execute(this.context, player)) return placement;
    return null;
  }

  private finishGame(): void {
    this.isMutable = false;
  }

  private discardTiles({ player, tiles }: { player: Player; tiles: ReadonlyArray<TileId> }): void {
    tiles.forEach((tile: TileId) => this.inventory.discardTile({ player, tileId: tile }));
  }

  private ensureMutability(): void {
    if (!this.isMutable) throw new Error('Game is immutable');
  }
}
