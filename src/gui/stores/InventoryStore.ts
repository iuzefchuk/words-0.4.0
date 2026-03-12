import { GameCell, GameTile } from '@/application/types.ts';
import { defineStore } from 'pinia';
import { shallowRef, ref, computed, triggerRef } from 'vue';
import GameStore from '@/gui/stores/GameStore.ts';

export default class InventoryStore {
  static readonly getInstance = defineStore('inventory', () => {
    const storeGame = GameStore.getInstance();
    const store = new InventoryStore(storeGame);
    return {
      tiles: store.tilesRef,
      selectedTile: store.selectedTileRef,
      inventoryIsFull: computed(() => store.inventoryIsFull),
      init: (userTiles: ReadonlyArray<GameTile>) => store.init(userTiles),
      isTileSelected: store.isTileSelected.bind(store),
      isTileVisible: store.isTileVisible.bind(store),
      handleClickRackCell: store.handleClickRackCell.bind(store),
      handleClickRackTile: store.handleClickRackTile.bind(store),
      handleClickBoardCell: store.handleClickBoardCell.bind(store),
      handleClickBoardTile: store.handleClickBoardTile.bind(store),
    };
  });

  private constructor(
    private gameStore: ReturnType<typeof GameStore.getInstance>,
    private tilesRef = shallowRef<Array<GameTile>>([]),
    private selectedTileRef = ref<GameTile | null>(null),
  ) {}

  private get tiles(): Array<GameTile> {
    return this.tilesRef.value;
  }

  private set tiles(newValue: Array<GameTile>) {
    this.tilesRef.value = newValue;
  }

  private get selectedTile(): GameTile | null {
    return this.selectedTileRef.value;
  }

  private set selectedTile(newValue: GameTile | null) {
    this.selectedTileRef.value = newValue;
  }

  private get inventoryIsFull(): boolean {
    return this.tiles.every(tile => !this.gameStore.isTileConnected(tile));
  }

  private get selectedTileIsConnected(): boolean {
    return this.selectedTile !== null && this.gameStore.isTileConnected(this.selectedTile);
  }

  private init(userTiles: ReadonlyArray<GameTile>): void {
    this.tiles = [...userTiles];
    this.selectedTile = null;
  }

  private deselectTile(): void {
    this.selectedTile = null;
  }

  private getTileIdx(tile: GameTile): number {
    return this.tiles.findIndex(item => this.gameStore.areTilesSame(item, tile));
  }

  private isTileInInventory(tile: GameTile): boolean {
    return this.getTileIdx(tile) !== -1;
  }

  private isTileSelected(tile: GameTile): boolean {
    return this.selectedTile !== null && this.gameStore.areTilesSame(this.selectedTile, tile);
  }

  private isTileVisible(tile: GameTile): boolean {
    return this.isTileInInventory(tile) && !this.gameStore.isTileConnected(tile);
  }

  private switchTiles(firstTile: GameTile, secondTile: GameTile): void {
    const firstIdx = this.getTileIdx(firstTile);
    const secondIdx = this.getTileIdx(secondTile);
    if (firstIdx === -1 || secondIdx === -1) throw new Error('Can`t find tile indexes');
    [this.tiles[firstIdx], this.tiles[secondIdx]] = [this.tiles[secondIdx], this.tiles[firstIdx]];
    triggerRef(this.tilesRef);
  }

  private handleClickRackCell(idx: number): void {
    if (!this.selectedTile) return;
    if (this.selectedTileIsConnected) this.gameStore.removeTile(this.selectedTile);
    this.switchTiles(this.selectedTile, this.tiles[idx]);
    this.deselectTile();
  }

  private handleClickRackTile(tile: GameTile): void {
    if (!this.selectedTile) {
      this.selectedTile = tile;
      return;
    }
    if (!this.isTileSelected(tile)) {
      const selectedCell = this.gameStore.findCellConnectedToTile(this.selectedTile);
      if (selectedCell) {
        this.gameStore.removeTile(this.selectedTile);
        this.gameStore.placeTile({ tile, cell: selectedCell });
      }
      this.switchTiles(this.selectedTile, tile);
    }
    this.deselectTile();
  }

  private handleClickBoardCell(cell: GameCell): void {
    if (!this.selectedTile) return;
    const existingTile = this.gameStore.findTileConnectedToCell(cell);
    if (existingTile) return;
    if (this.selectedTileIsConnected) this.gameStore.removeTile(this.selectedTile);
    this.gameStore.placeTile({ tile: this.selectedTile, cell });
    this.deselectTile();
  }

  private handleClickBoardTile(tile: GameTile): void {
    if (!this.isTileInInventory(tile)) return;
    if (this.isTileSelected(tile)) {
      this.deselectTile();
      return;
    }
    if (!this.selectedTile) {
      this.selectedTile = tile;
      return;
    }
    const connectedCell = this.gameStore.findCellConnectedToTile(tile);
    if (!connectedCell) return;
    const selectedCell = this.gameStore.findCellConnectedToTile(this.selectedTile);
    if (selectedCell) {
      this.gameStore.removeTile(this.selectedTile);
      this.gameStore.removeTile(tile);
      this.gameStore.placeTile({ tile, cell: selectedCell });
      this.gameStore.placeTile({ tile: this.selectedTile, cell: connectedCell });
    } else {
      this.gameStore.removeTile(tile);
      this.gameStore.placeTile({ tile: this.selectedTile, cell: connectedCell });
      this.switchTiles(this.selectedTile, tile);
    }
    this.deselectTile();
  }
}
