import { GameDomain } from '../domain/_index.js';
import { CellIndex, Bonus } from '@/domain/Layout/Layout.js';
import { TileId, Letter } from '../domain/Inventory.js';
import { TIME } from '@/shared/consts.js';
import { Player } from '@/domain/Player.js';
import { wait } from '@/shared/helpers.js';

export const GAME_BONUSES = Bonus;

export type GameCell = CellIndex;

export const GAME_LETTERS = Letter;

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

export class Game {
  private static readonly maxOpponentTurnGenerationAttempts = 1000;

  private constructor(private gameDomain: GameDomain) {}

  static start(): Game {
    const gameDomain = GameDomain.create()
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

  isTileConnected(tile: GameTile) {
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
    this.gameDomain.computeTurnState();
  }

  disconnectTileFromCell(tile: GameTile): void {
    this.gameDomain.disconnectTileFromCell(tile);
    this.gameDomain.computeTurnState();
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
      for (let i = 0; i < Game.maxOpponentTurnGenerationAttempts; i++) {
        const generatedInput = this.gameDomain.generateTurnInput({ player: Player.Opponent });
        if (generatedInput !== null) {
          for (const link of generatedInput.initPlacement) {
            this.gameDomain.connectTileToCell({ cell: link.cell, tile: link.tile });
            this.gameDomain.computeTurnState();
          }
        }
        if (this.gameDomain.currentTurnIsSavable) break;
      }
    });
    if (this.gameDomain.currentTurnIsSavable) this.gameDomain.saveTurn();
    else this.gameDomain.passTurn();
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
