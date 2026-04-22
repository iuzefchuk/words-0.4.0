import {
  GameBoardView,
  GameBonus,
  GameCell,
  GameEvent,
  GameInventoryView,
  GameLetter,
  GameMatchDifficulty,
  GameMatchResult,
  GameMatchType,
  GamePlayer,
  GameTile,
  GameTurnsView,
} from '@/application/types/index.ts';
import Game from '@/domain/Game.ts';

export default class QueriesService {
  private get boardView(): Readonly<GameBoardView> {
    return this.game.boardView;
  }

  private get inventoryView(): Readonly<GameInventoryView> {
    return this.game.inventoryView;
  }

  private get turnsView(): Readonly<GameTurnsView> {
    return this.game.turnsView;
  }

  constructor(private readonly game: Game) {}

  areTilesSame(first: GameTile, second: GameTile): boolean {
    return this.inventoryView.areTilesEqual(first, second);
  }

  findCellWithTile(tile: GameTile): GameCell | undefined {
    return this.boardView.findCellByTile(tile);
  }

  findTileOnCell(cell: GameCell): GameTile | undefined {
    return this.boardView.findTileByCell(cell);
  }

  getAdjacentCells(cell: GameCell): ReadonlyArray<GameCell> {
    return this.boardView.getAdjacentCells(cell);
  }

  getCellBonus(cell: GameCell): GameBonus | null {
    return this.boardView.getBonus(cell);
  }

  getCellColumnIndex(cell: GameCell): number {
    return this.boardView.getCellPositionInColumn(cell);
  }

  getCellRowIndex(cell: GameCell): number {
    return this.boardView.getCellPositionInRow(cell);
  }

  getCurrentTurnScore(): number | undefined {
    return this.turnsView.currentTurnScore;
  }

  getEventsLog(): ReadonlyArray<GameEvent> {
    return this.game.eventsLogView;
  }

  getMatchDifficulty(): GameMatchDifficulty {
    return this.game.matchView.settings.difficulty;
  }

  getMatchResult(): GameMatchResult {
    return this.game.matchView.getResultFor(GamePlayer.User);
  }

  getMatchType(): GameMatchType {
    return this.game.matchView.settings.type;
  }

  getOpponentScore(): number {
    return this.game.matchView.getScoreFor(GamePlayer.Opponent);
  }

  getTileLetter(tile: GameTile): GameLetter {
    return this.inventoryView.getTileLetter(tile);
  }

  getTilesRemaining(): number {
    return this.inventoryView.unusedTilesCount;
  }

  getUserScore(): number {
    return this.game.matchView.getScoreFor(GamePlayer.User);
  }

  getUserTiles(): ReadonlyArray<GameTile> {
    return this.inventoryView.getTilesFor(GamePlayer.User);
  }

  hasPriorTurns(): boolean {
    return this.turnsView.historyHasPriorTurns;
  }

  isCellCenter(cell: GameCell): boolean {
    return this.boardView.isCellCenter(cell);
  }

  isCurrentPlayerUser(): boolean {
    return this.turnsView.currentPlayer === GamePlayer.User;
  }

  isCurrentTurnValid(): boolean {
    return this.turnsView.currentTurnIsValid;
  }

  isDictionaryReady(): boolean {
    return this.game.dictionaryIsDefined;
  }

  isMatchFinished(): boolean {
    return this.game.matchView.isFinished;
  }

  isTilePlaced(tile: GameTile): boolean {
    return this.boardView.isTilePlaced(tile);
  }

  settingsChangeIsAllowed(): boolean {
    return this.game.settingsChangeIsAllowed;
  }

  wasTileUsedInPreviousTurn(tile: GameTile): boolean {
    return this.game.wasTileUsedInPreviousTurn(tile);
  }

  willUserPassBeResign(): boolean {
    return this.game.willPassBeResignFor(GamePlayer.User);
  }
}
