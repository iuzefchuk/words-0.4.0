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
  get queries(): AppQueries {
    return {
      areTilesSame: (first: GameTile, second: GameTile) => this.inventoryView.areTilesEqual(first, second),
      findCellWithTile: (tile: GameTile) => this.boardView.findCellByTile(tile),
      findTileOnCell: (cell: GameCell) => this.boardView.findTileByCell(cell),
      getBonusDistribution: () => this.boardView.bonusDistribution,
      getCellBonus: (cell: GameCell) => this.boardView.getBonus(cell),
      getCellColumnIndex: (cell: GameCell) => this.boardView.getColumnIndex(cell),
      getCellRowIndex: (cell: GameCell) => this.boardView.getRowIndex(cell),
      getCurrentTurnScore: () => this.turnsView.currentTurnScore,
      getCurrentTurnTopRightCell: () => this.getCurrentTurnTopRightCell(),
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
      isCellTopRightInCurrentTurn: (cell: GameCell) => this.isCellTopRightInCurrentTurn(cell),
      isCurrentPlayerUser: () => this.turnsView.currentPlayer === GamePlayer.User,
      isCurrentTurnValid: () => this.turnsView.currentTurnIsValid,
      isMatchFinished: () => this.game.matchView.isFinished,
      isTilePlaced: (tile: GameTile) => this.boardView.isTilePlaced(tile),
      wasTileUsedInPreviousTurn: (tile: GameTile) => this.wasTileUsedInPreviousTurn(tile),
      willUserPassBeResign: () => this.game.willPassBeResignFor(GamePlayer.User),
    };
  }
  private _previousTurnTileSet: Set<GameTile> | undefined;

  private _previousTurnTilesRef: ReadonlyArray<GameTile> | undefined;

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
