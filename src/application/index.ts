import { TIME } from '@/shared/constants.ts';
import { wait } from '@/shared/helpers.ts';
import { Player, Bonus, Letter } from '@/domain/enums.ts';
import { GameContext, Placement } from '@/domain/types.ts';
import Board from '@/domain/model/Board/index.ts';
import Dictionary from '@/domain/reference/Dictionary/index.ts';
import Layout from '@/domain/reference/Layout/index.ts';
import Inventory from '@/domain/model/Inventory/index.ts';
import Turnkeeper from '@/domain/model/Turn/index.ts';
import TurnValidator from '@/domain/services/Validation/index.ts';
import TurnGenerator from '@/domain/services/Generation/index.ts';
import TurnCompletion from '@/domain/services/TurnCompletion/index.ts';
import { GameCell, GameTile, GameState } from '@/application/types.ts';

export default class Game {
  private static readonly layout = Layout.create();
  private static readonly dictionary = Dictionary.create();

  readonly bonuses = Bonus;
  readonly letters = Letter;

  private isMutable: boolean = true;

  private constructor(
    private board: Board,
    private inventory: Inventory,
    private turnkeeper: Turnkeeper,
  ) {}

  static start(): Game {
    const players = Object.values(Player);
    const board = Board.create(Game.layout);
    const inventory = Inventory.create({ players });
    const turnkeeper = Turnkeeper.create({ players, board });
    return new Game(board, inventory, turnkeeper);
  }

  private get context(): GameContext {
    return {
      board: this.board,
      dictionary: Game.dictionary,
      inventory: this.inventory,
      turnkeeper: this.turnkeeper,
    };
  }

  get layoutCells(): ReadonlyArray<GameCell> {
    return this.board.cells;
  }

  get state(): GameState {
    return {
      isFinished: !this.isMutable,
      tilesRemaining: this.inventory.unusedTilesCount,
      userTiles: this.inventory.getTilesFor(Player.User),
      currentTurnScore: this.turnkeeper.currentTurnScore,
      userScore: this.turnkeeper.getScoreFor(Player.User),
      opponentScore: this.turnkeeper.getScoreFor(Player.Opponent),
      currentPlayerIsUser: this.turnkeeper.currentPlayer === Player.User,
      userPassWillBeResign: this.turnkeeper.hasPlayerPassed(Player.User),
    };
  }

  isCellInCenterOfLayout(cell: GameCell): boolean {
    return this.board.isCellCenter(cell);
  }

  getCellBonus(cell: GameCell): string | null {
    return this.board.getBonusForCell(cell);
  }

  findTileByCell(cell: GameCell): GameTile | undefined {
    return this.board.findTileByCell(cell);
  }

  findCellByTile(tile: GameTile): GameCell | undefined {
    return this.board.findCellByTile(tile);
  }

  isTileConnected(tile: GameTile): boolean {
    return this.board.isTileConnected(tile);
  }

  areTilesSame(firstTile: GameTile, secondTile: GameTile): boolean {
    return this.inventory.areTilesEqual(firstTile, secondTile);
  }

  getTileLetter(tile: GameTile): string {
    return this.inventory.getTileLetter(tile);
  }

  isCellLastConnectionInTurn(cell: GameCell): boolean {
    return this.turnkeeper.currentTurnCellSequence?.at(-1) === cell;
  }

  wasTileUsedInPreviousTurn(tile: GameTile): boolean {
    const { previousTurnTileSequence } = this.turnkeeper;
    if (!previousTurnTileSequence) return false;
    return previousTurnTileSequence.includes(tile);
  }

  shuffleUserTiles(): void {
    this.ensureMutability();
    this.inventory.shuffleTilesFor(Player.User);
  }

  placeTile({ cell, tile }: { cell: GameCell; tile: GameTile }): void {
    this.ensureMutability();
    this.turnkeeper.placeTile({ cell, tile });
    this.validateTurn();
  }

  removeTile(tile: GameTile): void {
    this.ensureMutability();
    this.turnkeeper.removeTile({ tile });
    this.validateTurn();
  }

  resetTurn(): void {
    this.ensureMutability();
    this.turnkeeper.resetCurrentTurn();
  }

  async saveTurn(): Promise<void> {
    this.ensureMutability();
    TurnCompletion.execute(this.context, this.turnkeeper.currentPlayer);
    if (this.turnkeeper.currentPlayer !== Player.User) await this.processOpponentTurn();
  }

  async passTurn(): Promise<void> {
    this.ensureMutability();
    this.turnkeeper.passCurrentTurn();
    if (this.turnkeeper.currentPlayer !== Player.User) await this.processOpponentTurn();
  }

  resignGame(): void {
    this.ensureMutability();
    this.turnkeeper.resignCurrentTurn();
    this.isMutable = false;
  }

  private validateTurn(): void {
    const result = TurnValidator.execute(this.context, this.turnkeeper.currentTurnPlacement);
    this.turnkeeper.setCurrentTurnValidation(result);
  }

  private generatePlacement(player: Player): Placement | null {
    for (const placement of TurnGenerator.execute(this.context, player)) return placement;
    return null;
  }

  private async processOpponentTurn(): Promise<void> {
    await this.setMinimumExecutionTime(() => {
      const generatedPlacement = this.generatePlacement(Player.Opponent);
      if (generatedPlacement === null) {
        this.turnkeeper.passCurrentTurn();
      } else {
        for (const link of generatedPlacement) this.turnkeeper.placeTile({ cell: link.cell, tile: link.tile });
        this.validateTurn();
        TurnCompletion.execute(this.context, this.turnkeeper.currentPlayer);
      }
    });
  }

  private async setMinimumExecutionTime<T>(
    callback: () => Promise<T> | T,
    delayTimeMs = TIME.ms_in_second,
  ): Promise<T> {
    const startTime = Date.now();
    const result = await callback();
    const elapsed = Date.now() - startTime;
    const delay = delayTimeMs - elapsed;
    if (delay > 0) await wait(delay);
    return result;
  }

  private ensureMutability(): void {
    if (!this.isMutable) throw new Error('Game is immutable');
  }
}
