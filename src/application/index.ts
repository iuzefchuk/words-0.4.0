import { TIME } from '@/shared/consts.ts';
import { wait } from '@/shared/helpers.ts';
import GameDomain from '@/domain/index.ts';
import { Bonus, Letter, Player } from '@/domain/enums.ts';
import { CellIndex } from '@/domain/Layout/types/shared.ts';
import { TileId } from '@/domain/Inventory/types/shared.ts';

export type GameCell = CellIndex;

export type GameTile = TileId;

export type GameState = {
  isFinished: boolean;
  tilesRemaining: number;
  userTiles: ReadonlyArray<GameTile>;
  currentTurnScore?: number;
  userScore: number;
  opponentScore: number;
  currentPlayerIsUser: boolean;
  userPassWillBeResign: boolean;
};

export default class Game {
  static bonuses = Bonus;
  static letters = Letter;

  private constructor(private gameDomain: GameDomain) {}

  static start(): Game {
    const gameDomain = GameDomain.create();
    return new Game(gameDomain);
  }

  get layoutCells(): ReadonlyArray<GameCell> {
    return this.gameDomain.layoutCells;
  }

  get state(): GameState {
    return {
      isFinished: this.gameDomain.isFinished,
      tilesRemaining: this.gameDomain.tilesRemaining,
      userTiles: this.gameDomain.userTiles,
      currentTurnScore: this.gameDomain.currentTurnScore,
      userScore: this.gameDomain.getScoreFor(Player.User),
      opponentScore: this.gameDomain.getScoreFor(Player.Opponent),
      currentPlayerIsUser: this.gameDomain.currentPlayerIsUser,
      userPassWillBeResign: this.gameDomain.userPassWillBeResign,
    };
  }

  isCellInCenterOfLayout(cell: GameCell): boolean {
    return this.gameDomain.isCellInCenterOfLayout(cell);
  }

  getCellBonus(cell: GameCell): string | null {
    return this.gameDomain.getCellBonus(cell);
  }

  findTileByCell(cell: GameCell): GameTile | undefined {
    return this.gameDomain.findTileByCell(cell);
  }

  findCellByTile(tile: GameTile): GameCell | undefined {
    return this.gameDomain.findCellByTile(tile);
  }

  isTileConnected(tile: GameTile): boolean {
    return this.gameDomain.isTileConnected(tile);
  }

  areTilesSame(firstTile: GameTile, secondTile: GameTile): boolean {
    return this.gameDomain.areTilesSame(firstTile, secondTile);
  }

  getTileLetter(tile: GameTile): string {
    return this.gameDomain.getTileLetter(tile);
  }

  isCellLastConnectionInTurn(cell: GameCell): boolean {
    return this.gameDomain.isCellLastConnectionInTurn(cell);
  }

  wasTileUsedInPreviousTurn(tile: GameTile): boolean {
    return this.gameDomain.wasTileUsedInPreviousTurn(tile);
  }

  shuffleUserTiles(): void {
    this.gameDomain.shuffleUserTiles();
  }

  connectTileToCell({ cell, tile }: { cell: GameCell; tile: GameTile }): void {
    this.gameDomain.connectTileToCell({ cell, tile });
    this.gameDomain.validateTurn();
  }

  disconnectTileFromCell(tile: GameTile): void {
    this.gameDomain.disconnectTileFromCell(tile);
    this.gameDomain.validateTurn();
  }

  resetTurn(): void {
    this.gameDomain.resetTurn();
  }

  async saveTurn(): Promise<void> {
    this.gameDomain.saveTurn();
    if (!this.gameDomain.currentPlayerIsUser) await this.processOpponentTurn();
  }

  async passTurn(): Promise<void> {
    this.gameDomain.passTurn();
    if (!this.gameDomain.currentPlayerIsUser) await this.processOpponentTurn();
  }

  resignGame(): void {
    this.gameDomain.resignGame();
  }

  private async processOpponentTurn(): Promise<void> {
    await this.setMinimumExecutionTime(() => {
      const generatedPlacement = this.gameDomain.generatePlacement({ player: Player.Opponent });
      if (generatedPlacement === null) {
        this.gameDomain.passTurn();
      } else {
        for (const link of generatedPlacement) this.gameDomain.connectTileToCell({ cell: link.cell, tile: link.tile });
        this.gameDomain.validateTurn();
        this.gameDomain.saveTurn();
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
}
