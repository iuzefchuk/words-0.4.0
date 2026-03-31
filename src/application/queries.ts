import {
  AppQueries,
  GameBoardView,
  GameCell,
  GameInventoryView,
  GamePlayer,
  GameTile,
  GameTurnsView,
} from '@/application/types.ts';
import Game from '@/domain/index.ts';

export default class AppQueryBuilder {
  private _previousTurnTilesRef: ReadonlyArray<GameTile> | undefined;
  private _previousTurnTileSet: Set<GameTile> | undefined;

  constructor(private readonly game: Game) {}

  get queries(): AppQueries {
    return {
      getBonusDistribution: () => this.boardView.bonusDistribution,
      hasPriorTurns: () => this.turnsView.historyHasPriorTurns,
      getTilesRemaining: () => this.inventoryView.unusedTilesCount,
      getUserTiles: () => this.inventoryView.getTilesFor(GamePlayer.User),
      getUserScore: () => this.game.matchView.getScoreFor(GamePlayer.User),
      getOpponentScore: () => this.game.matchView.getScoreFor(GamePlayer.Opponent),
      isCurrentPlayerUser: () => this.turnsView.currentPlayer === GamePlayer.User,
      getCurrentTurnScore: () => this.turnsView.currentTurnScore,
      isCurrentTurnValid: () => this.turnsView.currentTurnIsValid,
      willUserPassBeResign: () => this.game.willPassBeResignFor(GamePlayer.User),
      getEventLog: () => this.game.eventLog,
      isMatchFinished: () => this.game.matchView.isFinished,
      getMatchResult: () => this.game.matchView.getResultFor(GamePlayer.User),
      areTilesSame: (first: GameTile, second: GameTile) => this.inventoryView.areTilesEqual(first, second),
      getTileLetter: (tile: GameTile) => this.inventoryView.getTileLetter(tile),
      isCellCenter: (cell: GameCell) => this.boardView.isCellCenter(cell),
      getCellBonus: (cell: GameCell) => this.boardView.getBonus(cell),
      getCellRowIndex: (cell: GameCell) => this.boardView.getRowIndex(cell),
      getCellColumnIndex: (cell: GameCell) => this.boardView.getColumnIndex(cell),
      findTileOnCell: (cell: GameCell) => this.boardView.findTileByCell(cell),
      findCellWithTile: (tile: GameTile) => this.boardView.findCellByTile(tile),
      isTilePlaced: (tile: GameTile) => this.boardView.isTilePlaced(tile),
      getCurrentTurnTopRightCell: () => this.getCurrentTurnTopRightCell(),
      isCellTopRightInCurrentTurn: (cell: GameCell) => this.isCellTopRightInCurrentTurn(cell),
      wasTileUsedInPreviousTurn: (tile: GameTile) => this.wasTileUsedInPreviousTurn(tile),
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

  private getCurrentTurnTopRightCell(): GameCell | undefined {
    const { currentTurnCells: cells } = this.game.turnsView;
    if (cells === undefined || cells.length === 0) return undefined;
    return this.boardView.findCellInTopmostRow(cells);
  }

  private isCellTopRightInCurrentTurn(cell: GameCell): boolean {
    return cell === this.getCurrentTurnTopRightCell();
  }

  private wasTileUsedInPreviousTurn(tile: GameTile): boolean {
    const { previousTurnTiles: tiles } = this.game.turnsView;
    if (!tiles?.length) return false;
    if (tiles !== this._previousTurnTilesRef) {
      this._previousTurnTilesRef = tiles;
      this._previousTurnTileSet = new Set(tiles);
    }
    return this._previousTurnTileSet!.has(tile);
  }
}
