import { GameCell, GameTile } from '@/application/index.ts';
import { defineStore } from 'pinia';
import { shallowRef, ref, computed, triggerRef } from 'vue';
import MatchStore from '@/gui/stores/MatchStore.ts';
import UseOutline from '@/gui/composables/UseOutline.ts';

export default class RackStore {
  static readonly INSTANCE = defineStore('items', () => {
    const matchStore = MatchStore.INSTANCE();
    const store = new RackStore(matchStore);
    store.initialize(matchStore.userTiles);
    return {
      tiles: store.tilesRef,
      selectedTile: store.selectedTileRef,
      allTilesArePlaced: computed(() => store.allTilesArePlaced),
      anyTileIsPlaced: computed(() => store.anyTileIsPlaced),
      outlineGroups: computed(() => store.outlineGroups),
      initialize: () => store.initialize(matchStore.userTiles),
      isTileInRack: store.isTileInRack.bind(store),
      isTileSelected: store.isTileSelected.bind(store),
      isTileVisible: store.isTileVisible.bind(store),
      handleClickFooterCell: store.handleClickFooterCell.bind(store),
      handleClickFooterTile: store.handleClickFooterTile.bind(store),
      handleClickBoardCell: store.handleClickBoardCell.bind(store),
      handleClickBoardTile: store.handleClickBoardTile.bind(store),
      deselectTile: store.deselectTile.bind(store),
    };
  });

  private readonly outline = new UseOutline();

  private constructor(
    private matchStore: ReturnType<typeof MatchStore.INSTANCE>,
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

  private get allTilesArePlaced(): boolean {
    return this.tiles.every(tile => !this.matchStore.isTilePlaced(tile));
  }

  private get anyTileIsPlaced(): boolean {
    return this.tiles.some(tile => this.matchStore.isTilePlaced(tile));
  }

  private get outlineGroups(): ReadonlyArray<{ row: number; col: number; rowSpan: number; colSpan: number }> {
    return this.outline.collectGroups(this.tiles);
  }

  private get selectedTileIsPlaced(): boolean {
    return this.selectedTile !== null && this.matchStore.isTilePlaced(this.selectedTile);
  }

  private initialize(userTiles: ReadonlyArray<GameTile>): void {
    this.tiles = [...userTiles];
    this.selectedTile = null;
  }

  private deselectTile(): void {
    this.selectedTile = null;
  }

  private getTileIdx(tile: GameTile): number {
    return this.tiles.findIndex(item => this.matchStore.areTilesSame(item, tile));
  }

  private isTileInRack(tile: GameTile): boolean {
    return this.getTileIdx(tile) !== -1;
  }

  private isTileSelected(tile: GameTile): boolean {
    return this.selectedTile !== null && this.matchStore.areTilesSame(this.selectedTile, tile);
  }

  private isTileVisible(tile: GameTile): boolean {
    return this.isTileInRack(tile) && !this.matchStore.isTilePlaced(tile);
  }

  private switchTiles(firstTile: GameTile, secondTile: GameTile): void {
    const firstIdx = this.getTileIdx(firstTile);
    const secondIdx = this.getTileIdx(secondTile);
    if (firstIdx === -1 || secondIdx === -1) throw new Error('Can`t find tile indexes');
    [this.tiles[firstIdx], this.tiles[secondIdx]] = [this.tiles[secondIdx], this.tiles[firstIdx]];
    triggerRef(this.tilesRef);
  }

  private handleClickFooterCell(idx: number): void {
    const tile = this.tiles[idx];
    if (!this.selectedTile) {
      if (this.matchStore.isTilePlaced(tile)) this.matchStore.undoPlaceTile(tile);
      return;
    }
    if (this.selectedTileIsPlaced) this.matchStore.undoPlaceTile(this.selectedTile);
    this.switchTiles(this.selectedTile, tile);
    this.deselectTile();
  }

  private handleClickFooterTile(tile: GameTile): void {
    if (!this.selectedTile) {
      this.selectedTile = tile;
      return;
    }
    if (!this.isTileSelected(tile)) {
      const selectedCell = this.matchStore.findCellWithTile(this.selectedTile);
      if (selectedCell) {
        this.matchStore.undoPlaceTile(this.selectedTile);
        this.matchStore.placeTile({ tile, cell: selectedCell });
      }
      this.switchTiles(this.selectedTile, tile);
    }
    this.deselectTile();
  }

  private handleClickBoardCell(cell: GameCell): void {
    if (!this.selectedTile) return;
    const existingTile = this.matchStore.findTileOnCell(cell);
    if (existingTile) return;
    if (this.selectedTileIsPlaced) this.matchStore.undoPlaceTile(this.selectedTile);
    this.matchStore.placeTile({ tile: this.selectedTile, cell });
    this.deselectTile();
  }

  private handleClickBoardTile(tile: GameTile): void {
    if (!this.isTileInRack(tile)) return;
    if (this.isTileSelected(tile)) {
      this.deselectTile();
      return;
    }
    if (!this.selectedTile) {
      this.selectedTile = tile;
      return;
    }
    const tileCell = this.matchStore.findCellWithTile(tile);
    if (!tileCell) return;
    const selectedCell = this.matchStore.findCellWithTile(this.selectedTile);
    if (selectedCell) {
      this.matchStore.undoPlaceTile(this.selectedTile);
      this.matchStore.undoPlaceTile(tile);
      this.matchStore.placeTile({ tile, cell: selectedCell });
      this.matchStore.placeTile({ tile: this.selectedTile, cell: tileCell });
    } else {
      this.matchStore.undoPlaceTile(tile);
      this.matchStore.placeTile({ tile: this.selectedTile, cell: tileCell });
      this.switchTiles(this.selectedTile, tile);
    }
    this.deselectTile();
  }
}
