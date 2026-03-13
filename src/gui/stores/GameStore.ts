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
      isCellInCenterOfLayout: game.isCellInCenterOfLayout,
      getCellBonus: game.getCellBonus,
      findTileConnectedToCell: game.findTileByCell,
      findCellConnectedToTile: game.findCellByTile,
      isTileConnected: game.isTileConnected,
      areTilesSame: game.areTilesSame,
      getTileLetter: game.getTileLetter,
      isCellLastConnectionInTurn: game.isCellLastConnectionInTurn,
      wasTileUsedInLastTurn: game.wasTileUsedInPreviousTurn,
      shuffleUserTiles: state.updateAfterCallback(() => game.shuffleUserTiles()),
      placeTile: (args: { cell: GameCell; tile: GameTile }) => state.updateAfterCallback(() => game.placeTile(args)),
      undoPlaceTile: (tile: GameTile) => state.updateAfterCallback(() => game.undoPlaceTile(tile)),
      resetTurn: () => state.updateAfterCallback(() => game.resetTurn()),
      saveTurn: () => state.updateAfterCallback(() => game.saveTurn()),
      passTurn: () => state.updateAfterCallback(() => game.passTurn()),
      resignGame: () => state.updateAfterCallback(() => game.resignGame()),
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

    updateAfterCallback<T>(callback: () => T): T {
      const result = callback();
      triggerRef(this.stateRef);
      return result;
    }
  };
}
