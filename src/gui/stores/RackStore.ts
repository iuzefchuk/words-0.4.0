import { defineStore } from 'pinia';
import { computed, ref, shallowRef, triggerRef } from 'vue';
import { GameCell, GameTile } from '@/application/types.ts';
import MatchStore from '@/gui/stores/MatchStore.ts';
import shuffleWithFisherYates from '@/shared/shuffleWithFisherYates.ts';

export default class RackStore {
  static readonly INSTANCE = defineStore('items', () => {
    const matchStore = MatchStore.INSTANCE();
    const store = new RackStore(matchStore);
    store.initialize(matchStore.userTiles);
    return {
      anyTileIsPlaced: computed(() => store.anyTileIsPlaced),
      deselectTile: store.deselectTile.bind(store),
      handleClickBoardCell: store.handleClickBoardCell.bind(store),
      handleClickBoardTile: store.handleClickBoardTile.bind(store),
      handleClickFooterCell: store.handleClickFooterCell.bind(store),
      handleClickFooterTile: store.handleClickFooterTile.bind(store),
      handleDoubleClickBoardTile: store.handleDoubleClickBoardTile.bind(store),
      initialize: () => store.initialize(matchStore.userTiles),
      isTileInRack: store.isTileInRack.bind(store),
      isTileSelected: store.isTileSelected.bind(store),
      isTileVisible: store.isTileVisible.bind(store),
      selectedTile: store.selectedTileRef,
      shuffle: () => store.shuffle(),
      tiles: store.tilesRef,
    };
  });

  private get anyTileIsPlaced(): boolean {
    return this.tiles.some(tile => this.matchStore.isTilePlaced(tile));
  }

  private get selectedTile(): GameTile | null {
    return this.selectedTileRef.value;
  }

  private set selectedTile(newValue: GameTile | null) {
    this.selectedTileRef.value = newValue;
  }

  private get selectedTileIsPlaced(): boolean {
    return this.selectedTile !== null && this.matchStore.isTilePlaced(this.selectedTile);
  }

  private get tiles(): Array<GameTile> {
    return this.tilesRef.value;
  }

  private set tiles(newValue: Array<GameTile>) {
    this.tilesRef.value = newValue;
  }

  private constructor(
    private matchStore: ReturnType<typeof MatchStore.INSTANCE>,
    private tilesRef = shallowRef<Array<GameTile>>([]),
    private selectedTileRef = ref<GameTile | null>(null),
  ) {}

  private deselectTile(): void {
    this.selectedTile = null;
  }

  private getTileIdx(tile: GameTile): number {
    return this.tiles.indexOf(tile);
  }

  private handleClickBoardCell(cell: GameCell): void {
    if (!this.selectedTile) return;
    const existingTile = this.matchStore.findTileOnCell(cell);
    if (existingTile) return;
    if (this.selectedTileIsPlaced) this.matchStore.undoPlaceTile(this.selectedTile);
    this.matchStore.placeTile({ cell, tile: this.selectedTile });
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
      this.matchStore.placeTile({ cell: selectedCell, tile });
      this.matchStore.placeTile({ cell: tileCell, tile: this.selectedTile });
    } else {
      this.matchStore.undoPlaceTile(tile);
      this.matchStore.placeTile({ cell: tileCell, tile: this.selectedTile });
      this.switchTiles(this.selectedTile, tile);
    }
    this.deselectTile();
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
        this.matchStore.placeTile({ cell: selectedCell, tile });
      }
      this.switchTiles(this.selectedTile, tile);
    }
    this.deselectTile();
  }

  private handleDoubleClickBoardTile(tile: GameTile): void {
    if (!this.isTileInRack(tile)) return;
    this.deselectTile();
    this.matchStore.undoPlaceTile(tile);
  }

  private initialize(userTiles: ReadonlyArray<GameTile>): void {
    this.tiles.splice(0, this.tiles.length, ...userTiles);
    triggerRef(this.tilesRef);
    this.selectedTile = null;
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

  private shuffle(): void {
    shuffleWithFisherYates(this.tiles);
    triggerRef(this.tilesRef);
  }

  private switchTiles(firstTile: GameTile, secondTile: GameTile): void {
    const firstIdx = this.getTileIdx(firstTile);
    const secondIdx = this.getTileIdx(secondTile);
    if (firstIdx === -1 || secondIdx === -1) throw new Error('Can`t find tile indexes');
    [this.tiles[firstIdx], this.tiles[secondIdx]] = [this.tiles[secondIdx], this.tiles[firstIdx]];
    triggerRef(this.tilesRef);
  }
}
