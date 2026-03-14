import Game, { GameCell, GameState, GameTile } from '@/application/Game.ts';
import { defineStore } from 'pinia';
import { computed, Ref, shallowRef, triggerRef } from 'vue';

export default class GameStore {
  static readonly getInstance = defineStore('game', () => {
    const game = Game.start();
    const state = new GameStore.ReactiveState(game);
    return {
      bonuses: Game.bonuses,
      letters: Game.letters,
      layoutCells: game.layoutCells,
      gameIsFinished: state.isFinished,
      tilesRemaining: state.tilesRemaining,
      userTiles: state.userTiles,
      unsavedTurnScore: state.currentTurnScore,
      userScore: state.userScore,
      opponentScore: state.opponentScore,
      currentPlayerIsUser: state.currentPlayerIsUser,
      userPassWillBeResign: state.userPassWillBeResign,
      isCellInCenterOfLayout: (cell: GameCell) => game.isCellInCenterOfLayout(cell),
      getCellBonus: (cell: GameCell) => game.getCellBonus(cell),
      findTileOnCell: (cell: GameCell) => state.voidRefBefore(() => game.findTileByCell(cell)),
      findCellWithTile: (tile: GameTile) => state.voidRefBefore(() => game.findCellByTile(tile)),
      isTilePlaced: (tile: GameTile) => state.voidRefBefore(() => game.isTilePlaced(tile)),
      areTilesSame: (firstTile: GameTile, secondTile: GameTile) => game.areTilesSame(firstTile, secondTile),
      getTileLetter: (tile: GameTile) => game.getTileLetter(tile),
      isCellLastConnectionInTurn: (cell: GameCell) => state.voidRefBefore(() => game.isCellLastConnectionInTurn(cell)),
      wasTileUsedInLastTurn: (tile: GameTile) => state.voidRefBefore(() => game.wasTileUsedInPreviousTurn(tile)),
      shuffleUserTiles: () => state.triggerRefAfter(() => game.shuffleUserTiles()),
      placeTile: (args: { cell: GameCell; tile: GameTile }) => state.triggerRefAfter(() => game.placeTile(args)),
      undoPlaceTile: (tile: GameTile) => state.triggerRefAfter(() => game.undoPlaceTile(tile)),
      resetTurn: () => state.triggerRefAfter(() => game.resetTurn()),
      saveTurn: () => state.triggerRefAfter(() => game.saveTurn()),
      passTurn: () => state.triggerRefAfter(() => game.passTurn()),
      resignGame: () => state.triggerRefAfter(() => game.resignGame()),
    };
  });

  private static ReactiveState = class {
    readonly isFinished = computed(() => this.state.isFinished);
    readonly tilesRemaining = computed(() => this.state.tilesRemaining);
    readonly userTiles = computed(() => this.state.userTiles);
    readonly currentTurnScore = computed(() => this.state.currentTurnScore);
    readonly userScore = computed(() => this.state.userScore);
    readonly opponentScore = computed(() => this.state.opponentScore);
    readonly currentPlayerIsUser = computed(() => this.state.currentPlayerIsUser);
    readonly userPassWillBeResign = computed(() => this.state.userPassWillBeResign);

    private readonly stateRef: Ref<GameState>;

    constructor(private readonly game: Game) {
      this.stateRef = shallowRef(this.game.state);
    }

    private get state(): GameState {
      return this.stateRef.value;
    }

    voidRefBefore<T>(callback: () => T): T {
      void this.stateRef.value;
      return callback();
    }

    triggerRefAfter<T>(callback: () => T): T {
      const result = callback();
      triggerRef(this.stateRef);
      return result;
    }
  };
}
