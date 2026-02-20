import { Game, GameCell, GameTile } from '@/application/_index.js';
import { defineStore } from 'pinia';
import { computed, shallowRef, triggerRef } from 'vue';

export const useStoreGame = defineStore('game', () => {
  const game = Game.start();

  const { layoutCells } = game;

  const reactiveGameState = shallowRef(game.state);
  const gameIsFinished = computed(() => reactiveGameState.value.isFinished);
  const tilesRemaining = computed(() => reactiveGameState.value.tilesRemaining);
  const userTiles = computed(() => reactiveGameState.value.userTiles);
  const unsavedTurnScore = computed(() => reactiveGameState.value.currentTurnScore);
  const userScore = computed(() => reactiveGameState.value.userScore);
  const opponentScore = computed(() => reactiveGameState.value.opponentScore);
  const currentPlayerIsUser = computed(() => reactiveGameState.value.currentPlayerIsUser);
  const userPassWillBeResign = computed(() => reactiveGameState.value.userPassWillBeResign);

  const isCellInCenterOfLayout = (cell: GameCell): boolean => game.isCellInCenterOfLayout(cell);
  const getCellBonus = (cell: GameCell): string | null => game.getCellBonus(cell);
  const findTileConnectedToCell = (cell: GameCell): GameTile | undefined => game.findTileByCell(cell);
  const findCellConnectedToTile = (tile: GameTile): GameCell | undefined => game.findCellByTile(tile);
  const isTileConnected = (tile: GameTile): boolean => game.isTileConnected(tile);
  const areTilesSame = (firstTile: GameTile, secondTile: GameTile): boolean => game.areTilesSame(firstTile, secondTile);
  const getTileLetter = (tile: GameTile): string => game.getTileLetter(tile);
  const isCellLastConnectionInTurn = (cell: GameCell): boolean => game.isCellLastConnectionInTurn(cell);
  const wasTileUsedInLastTurn = (tile: GameTile): boolean => game.wasTileUsedInPreviousTurn(tile);

  function shuffleUserTiles(): void {
    game.shuffleUserTiles();
    triggerRef(reactiveGameState);
  }

  function connectTileToCell({ cell, tile }: { cell: GameCell; tile: GameTile }): void {
    game.connectTileToCell({ cell, tile });
    triggerRef(reactiveGameState);
  }

  function disconnectTileFromCell(tile: GameTile): void {
    game.disconnectTileFromCell(tile);
    triggerRef(reactiveGameState);
  }

  function resetTurn(): void {
    game.resetTurn();
    triggerRef(reactiveGameState);
  }

  function saveTurn(): void {
    game.saveTurn();
    triggerRef(reactiveGameState);
  }

  function passTurn(): void {
    game.passTurn();
    triggerRef(reactiveGameState);
  }

  function resignGame(): void {
    game.resignGame();
    triggerRef(reactiveGameState);
  }

  return {
    layoutCells,
    gameIsFinished,
    tilesRemaining,
    userTiles,
    unsavedTurnScore,
    userScore,
    opponentScore,
    currentPlayerIsUser,
    userPassWillBeResign,
    isCellInCenterOfLayout,
    getCellBonus,
    findTileConnectedToCell,
    findCellConnectedToTile,
    isTileConnected,
    areTilesSame,
    getTileLetter,
    isCellLastConnectionInTurn,
    wasTileUsedInLastTurn,
    shuffleUserTiles,
    connectTileToCell,
    disconnectTileFromCell,
    resetTurn,
    saveTurn,
    passTurn,
    resignGame,
  };
});
