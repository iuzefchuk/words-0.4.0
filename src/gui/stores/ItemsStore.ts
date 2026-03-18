import { GameCell, GameTile } from '@/application/types.ts';
import { defineStore } from 'pinia';
import { shallowRef, ref, computed, triggerRef } from 'vue';
import GameStore from '@/gui/stores/GameStore.ts';

export default class ItemsStore {
  // TODO game controlls store ?
  static readonly getInstance = defineStore('items', () => {
    const gameStore = GameStore.getInstance();
    const store = new ItemsStore(gameStore);
    store.initialize(gameStore.userTiles);
    return {
      tiles: store.tilesRef,
      selectedTile: store.selectedTileRef,
      allItemsAreConnected: computed(() => store.allItemsAreConnected),
      initialize: () => store.initialize(gameStore.userTiles),
      isTileInItems: store.isTileInItems.bind(store),
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

  private get allItemsAreConnected(): boolean {
    return this.tiles.every(tile => !this.gameStore.isTilePlaced(tile));
  }

  private get selectedTileIsPlaced(): boolean {
    return this.selectedTile !== null && this.gameStore.isTilePlaced(this.selectedTile);
  }

  private initialize(userTiles: ReadonlyArray<GameTile>): void {
    this.tiles = [...userTiles];
    this.selectedTile = null;
  }

  private deselectTile(): void {
    this.selectedTile = null;
  }

  private getTileIdx(tile: GameTile): number {
    return this.tiles.findIndex(item => this.gameStore.areTilesSame(item, tile));
  }

  private isTileInItems(tile: GameTile): boolean {
    return this.getTileIdx(tile) !== -1;
  }

  private isTileSelected(tile: GameTile): boolean {
    return this.selectedTile !== null && this.gameStore.areTilesSame(this.selectedTile, tile);
  }

  private isTileVisible(tile: GameTile): boolean {
    return this.isTileInItems(tile) && !this.gameStore.isTilePlaced(tile);
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
    if (this.selectedTileIsPlaced) this.gameStore.undoPlaceTile(this.selectedTile);
    this.switchTiles(this.selectedTile, this.tiles[idx]);
    this.deselectTile();
  }

  private handleClickRackTile(tile: GameTile): void {
    if (!this.selectedTile) {
      this.selectedTile = tile;
      return;
    }
    if (!this.isTileSelected(tile)) {
      const selectedCell = this.gameStore.findCellWithTile(this.selectedTile);
      if (selectedCell) {
        this.gameStore.undoPlaceTile(this.selectedTile);
        this.gameStore.placeTile({ tile, cell: selectedCell });
      }
      this.switchTiles(this.selectedTile, tile);
    }
    this.deselectTile();
  }

  private handleClickBoardCell(cell: GameCell): void {
    if (!this.selectedTile) return;
    const existingTile = this.gameStore.findTileOnCell(cell);
    if (existingTile) return;
    if (this.selectedTileIsPlaced) this.gameStore.undoPlaceTile(this.selectedTile);
    this.gameStore.placeTile({ tile: this.selectedTile, cell });
    this.deselectTile();
  }

  private handleClickBoardTile(tile: GameTile): void {
    if (!this.isTileInItems(tile)) return;
    if (this.isTileSelected(tile)) {
      this.deselectTile();
      return;
    }
    if (!this.selectedTile) {
      this.selectedTile = tile;
      return;
    }
    const tileCell = this.gameStore.findCellWithTile(tile);
    if (!tileCell) return;
    const selectedCell = this.gameStore.findCellWithTile(this.selectedTile);
    if (selectedCell) {
      this.gameStore.undoPlaceTile(this.selectedTile);
      this.gameStore.undoPlaceTile(tile);
      this.gameStore.placeTile({ tile, cell: selectedCell });
      this.gameStore.placeTile({ tile: this.selectedTile, cell: tileCell });
    } else {
      this.gameStore.undoPlaceTile(tile);
      this.gameStore.placeTile({ tile: this.selectedTile, cell: tileCell });
      this.switchTiles(this.selectedTile, tile);
    }
    this.deselectTile();
  }
}
