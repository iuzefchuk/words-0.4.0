import Game from '@/application/index.ts';
import { GameCell, GameTile } from '@/application/types.ts';
import { defineStore } from 'pinia';
import { computed, shallowRef, triggerRef } from 'vue';

export default class GameStore {
  static readonly instance = defineStore('game', () => {
    const game = Game.start();
    const stateRef = shallowRef(game.state);
    const state = stateRef.value;
    function runSetter(action: () => void): void {
      action();
      triggerRef(stateRef);
    }
    return {
      bonuses: game.bonuses,
      letters: game.letters,
      layoutCells: game.layoutCells,
      gameIsFinished: computed(() => state.isFinished),
      tilesRemaining: computed(() => state.tilesRemaining),
      userTiles: computed(() => state.userTiles),
      unsavedTurnScore: computed(() => state.currentTurnScore),
      userScore: computed(() => state.userScore),
      opponentScore: computed(() => state.opponentScore),
      currentPlayerIsUser: computed(() => state.currentPlayerIsUser),
      userPassWillBeResign: computed(() => state.userPassWillBeResign),
      isCellInCenterOfLayout: (cell: GameCell) => game.isCellInCenterOfLayout(cell),
      getCellBonus: (cell: GameCell) => game.getCellBonus(cell),
      findTileConnectedToCell: (cell: GameCell) => game.findTileByCell(cell),
      findCellConnectedToTile: (tile: GameTile) => game.findCellByTile(tile),
      isTileConnected: (tile: GameTile) => game.isTileConnected(tile),
      areTilesSame: (firstTile: GameTile, secondTile: GameTile) => game.areTilesSame(firstTile, secondTile),
      getTileLetter: (tile: GameTile) => game.getTileLetter(tile),
      isCellLastConnectionInTurn: (cell: GameCell) => game.isCellLastConnectionInTurn(cell),
      wasTileUsedInLastTurn: (tile: GameTile) => game.wasTileUsedInPreviousTurn(tile),
      shuffleUserTiles: runSetter(() => game.shuffleUserTiles()),
      placeTile: (args: { cell: GameCell; tile: GameTile }) => runSetter(() => game.placeTile(args)),
      removeTile: (tile: GameTile) => runSetter(() => game.removeTile(tile)),
      resetTurn: runSetter(game.resetTurn),
      saveTurn: runSetter(game.saveTurn),
      passTurn: runSetter(game.passTurn),
      resignGame: runSetter(game.resignGame),
    };
  });
}
