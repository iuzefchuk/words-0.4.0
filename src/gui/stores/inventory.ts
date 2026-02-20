import { GameCell, GameTile } from '@/application/_index.js';
import { defineStore, storeToRefs } from 'pinia';
import { shallowRef, ref, computed, triggerRef } from 'vue';
import { useStoreGame } from '@/gui/stores/game.js';

export const useStoreInventory = defineStore('inventory', () => {
  const storeGame = useStoreGame();
  const { userTiles } = storeToRefs(storeGame);
  const inventoryList = shallowRef<Array<GameTile>>([]);
  const selectedTile = ref<GameTile | null>(null);
  const selectedTileIsConnected = computed(
    () => selectedTile.value !== null && storeGame.isTileConnected(selectedTile.value),
  );
  const isInventoryFull = computed(() => inventoryList.value.every(isTileVisible));

  function getTileIdx(tile: GameTile): number {
    return inventoryList.value.findIndex(item => storeGame.areTilesSame(item, tile));
  }

  function isTileInInventory(tile: GameTile): boolean {
    return getTileIdx(tile) !== -1;
  }

  function isTileSelected(tile: GameTile): boolean {
    return selectedTile.value !== null && storeGame.areTilesSame(selectedTile.value, tile);
  }

  function isTileVisible(tile: GameTile): boolean {
    return isTileInInventory(tile) && !storeGame.isTileConnected(tile);
  }

  function switchTiles(firstTile: GameTile, secondTile: GameTile): void {
    const firstIdx = getTileIdx(firstTile);
    const secondIdx = getTileIdx(secondTile);
    [inventoryList.value[firstIdx], inventoryList.value[secondIdx]] = [
      inventoryList.value[secondIdx],
      inventoryList.value[firstIdx],
    ];
    triggerRef(inventoryList);
  }

  function handleClickRackCell(idx: number): void {
    if (!selectedTile.value) return;
    if (selectedTileIsConnected.value) storeGame.disconnectTileFromCell(selectedTile.value);
    switchTiles(selectedTile.value, inventoryList.value[idx]);
    deselectTile();
  }

  function handleClickRackTile(tile: GameTile): void {
    if (!selectedTile.value) {
      selectedTile.value = tile;
      return;
    }
    if (!isTileSelected(tile)) {
      const selectedTileConnectedCell = storeGame.findCellConnectedToTile(selectedTile.value);
      if (selectedTileConnectedCell) {
        storeGame.disconnectTileFromCell(selectedTile.value);
        storeGame.connectTileToCell({ tile, cell: selectedTileConnectedCell });
      }
      switchTiles(selectedTile.value, tile);
    }
    deselectTile();
  }

  function handleClickLayoutCell(cell: GameCell): void {
    if (!selectedTile.value) return;
    const tile = storeGame.findTileConnectedToCell(cell);
    if (tile !== null) return;
    if (selectedTileIsConnected.value) {
      storeGame.disconnectTileFromCell(selectedTile.value);
      storeGame.connectTileToCell({ tile: selectedTile.value, cell });
    } else {
      storeGame.connectTileToCell({ cell, tile: selectedTile.value });
    }
    deselectTile();
  }

  function handleClickLayoutTile(tile: GameTile): void {
    if (!isTileInInventory(tile)) return;
    if (isTileSelected(tile)) return deselectTile();
    if (!selectedTile.value) {
      selectedTile.value = tile;
      return;
    }
    const connectedCell = storeGame.findCellConnectedToTile(tile);
    if (connectedCell === undefined) return;
    const selectedTileConnectedCell = storeGame.findCellConnectedToTile(selectedTile.value);
    if (selectedTileConnectedCell) {
      storeGame.disconnectTileFromCell(selectedTile.value);
      storeGame.disconnectTileFromCell(tile);
      storeGame.connectTileToCell({ tile, cell: selectedTileConnectedCell });
      storeGame.connectTileToCell({ tile: selectedTile.value, cell: connectedCell });
    } else {
      storeGame.disconnectTileFromCell(tile);
      storeGame.connectTileToCell({ tile: selectedTile.value, cell: connectedCell });
      switchTiles(selectedTile.value, tile);
    }
    deselectTile();
  }

  function deselectTile(): void {
    selectedTile.value = null;
  }

  function init(): void {
    inventoryList.value = [...userTiles.value];
    deselectTile();
  }

  init();

  return {
    inventoryList,
    isInventoryFull,
    isTileInInventory,
    isTileSelected,
    isTileVisible,
    handleClickRackCell,
    handleClickRackTile,
    handleClickLayoutCell,
    handleClickLayoutTile,
    init,
  };
});
