import { Bonus, Board, CellIndex } from '@/domain/models/Board.ts';
import Dictionary from '@/domain/models/Dictionary.ts';
import { Letter, Player } from '@/domain/enums.ts';
import Inventory, { TileId } from '@/domain/models/Inventory.ts';
import { PlacementLinks } from '@/domain/models/TurnHistory.ts';
import { TIME } from '@/shared/constants.ts';
import { wait } from '@/shared/helpers.ts';
import GameStateQuery from '@/application/queries/GameState.ts';
import PlacementLinksGenerator from '@/application/services/PlacementLinksGenerator.ts';
import TurnValidator from '@/application/services/TurnValidator.ts';
import TurnDirector from '@/application/TurnDirector.ts';
import PassTurnCommand from '@/application/commands/PassTurn.ts';
import PlaceTileCommand from '@/application/commands/PlaceTile.ts';
import ResignGameCommand from '@/application/commands/ResignGame.ts';
import SaveTurnCommand from '@/application/commands/SaveTurn.ts';
import UndoPlaceTileCommand from '@/application/commands/UndoPlaceTile.ts';

export type GameContext = {
  board: Board;
  dictionary: Dictionary;
  inventory: Inventory;
  turnDirector: TurnDirector;
};

export type GameCell = CellIndex;

export type GameTile = TileId;

export type GameState = {
  isFinished: boolean;
  tilesRemaining: number;
  userTiles: ReadonlyArray<TileId>;
  currentTurnScore?: number;
  userScore: number;
  opponentScore: number;
  currentPlayerIsUser: boolean;
  userPassWillBeResign: boolean;
};

export default class Game {
  private static readonly dictionary = Dictionary.create();

  static readonly bonuses = Bonus;
  static readonly letters = Letter;

  private isMutable: boolean = true;

  private constructor(
    private board: Board,
    private inventory: Inventory,
    private turnDirector: TurnDirector,
  ) {}

  static start(): Game {
    const players = Object.values(Player);
    const board = Board.create();
    const inventory = Inventory.create({ players });
    const turnDirector = TurnDirector.create({ players, board });
    return new Game(board, inventory, turnDirector);
  }

  private get context(): GameContext {
    return {
      board: this.board,
      dictionary: Game.dictionary,
      inventory: this.inventory,
      turnDirector: this.turnDirector,
    };
  }

  get layoutCells(): ReadonlyArray<GameCell> {
    return this.board.cells;
  }

  get state(): GameState {
    return GameStateQuery.execute(this.context, this.isMutable);
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
    return this.turnDirector.currentTurnCellSequence?.at(-1) === cell;
  }

  wasTileUsedInPreviousTurn(tile: GameTile): boolean {
    const { previousTurnTileSequence } = this.turnDirector;
    if (!previousTurnTileSequence) return false;
    return previousTurnTileSequence.includes(tile);
  }

  shuffleUserTiles(): void {
    this.ensureMutability();
    this.inventory.shuffleTilesFor(Player.User);
  }

  placeTile({ cell, tile }: { cell: GameCell; tile: GameTile }): void {
    this.ensureMutability();
    PlaceTileCommand.execute(this.context, { cell, tile });
  }

  undoPlaceTile(tile: GameTile): void {
    this.ensureMutability();
    UndoPlaceTileCommand.execute(this.context, { tile });
  }

  resetTurn(): void {
    this.ensureMutability();
    this.turnDirector.resetCurrentTurn();
  }

  async saveTurn(): Promise<void> {
    this.ensureMutability();
    SaveTurnCommand.execute(this.context);
    if (this.turnDirector.currentPlayer !== Player.User) await this.processOpponentTurn();
  }

  async passTurn(): Promise<void> {
    this.ensureMutability();
    PassTurnCommand.execute(this.context);
    if (this.turnDirector.currentPlayer !== Player.User) await this.processOpponentTurn();
  }

  resignGame(): void {
    this.ensureMutability();
    ResignGameCommand.execute(this.context);
    this.isMutable = false;
  }

  private generatePlacementLinks(player: Player): PlacementLinks | null {
    for (const placementLinks of PlacementLinksGenerator.execute(this.context, player)) return placementLinks;
    return null;
  }

  private async processOpponentTurn(): Promise<void> {
    await this.setMinimumExecutionTime(() => {
      const generatedPlacementLinks = this.generatePlacementLinks(Player.Opponent);
      if (generatedPlacementLinks === null) {
        PassTurnCommand.execute(this.context);
      } else {
        for (const link of generatedPlacementLinks) this.turnDirector.placeTile({ cell: link.cell, tile: link.tile });
        const result = TurnValidator.execute(this.context, this.turnDirector.currentTurnPlacementLinks);
        this.turnDirector.setCurrentTurnValidation(result);
        SaveTurnCommand.execute(this.context);
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
