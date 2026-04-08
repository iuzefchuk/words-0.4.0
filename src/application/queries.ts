import { AppQueries, GameBoardView, GameCell, GameInventoryView, GamePlayer, GameTile, GameTurnsView } from '@/application/types.ts';
import Game from '@/domain/Game.ts';

export default class AppQueryBuilder {
  get queries(): AppQueries {
    return {
      areTilesSame: (first: GameTile, second: GameTile) => this.inventoryView.areTilesEqual(first, second),
      findCellWithTile: (tile: GameTile) => this.boardView.findCellByTile(tile),
      findTileOnCell: (cell: GameCell) => this.boardView.findTileByCell(cell),
      getBoardType: () => this.boardView.type,
      getCellBonus: (cell: GameCell) => this.boardView.getBonus(cell),
      getCellColumnIndex: (cell: GameCell) => this.boardView.getCellPositionInColumn(cell),
      getCellRowIndex: (cell: GameCell) => this.boardView.getCellPositionInRow(cell),
      getCurrentTurnScore: () => this.turnsView.currentTurnScore,
      getDifficulty: () => this.game.difficulty,
      getEventLog: () => this.game.eventLog,
      getMatchResult: () => this.game.matchView.getResultFor(GamePlayer.User),
      getOpponentScore: () => this.game.matchView.getScoreFor(GamePlayer.Opponent),
      getTileLetter: (tile: GameTile) => this.inventoryView.getTileLetter(tile),
      getTilesRemaining: () => this.inventoryView.unusedTilesCount,
      getUserScore: () => this.game.matchView.getScoreFor(GamePlayer.User),
      getUserTiles: () => this.inventoryView.getTilesFor(GamePlayer.User),
      hasPriorTurns: () => this.turnsView.historyHasPriorTurns,
      isCellCenter: (cell: GameCell) => this.boardView.isCellCenter(cell),
      isCurrentPlayerUser: () => this.turnsView.currentPlayer === GamePlayer.User,
      isCurrentTurnValid: () => this.turnsView.currentTurnIsValid,
      isMatchFinished: () => this.game.matchView.isFinished,
      isTilePlaced: (tile: GameTile) => this.boardView.isTilePlaced(tile),
      settingsChangeIsAllowed: () => this.game.settingsChangeIsAllowed,
      wasTileUsedInPreviousTurn: (tile: GameTile) => this.game.wasTileUsedInPreviousTurn(tile),
      willUserPassBeResign: () => this.game.willPassBeResignFor(GamePlayer.User),
    };
  }
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
}
