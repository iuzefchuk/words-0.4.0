import { defineStore } from 'pinia';
import { computed, ref, shallowRef, triggerRef } from 'vue';
import { GameTile } from '@/application/types/index.ts';
import MainStore from '@/interface/stores/MainStore.ts';
import shuffleWithFisherYates from '@/shared/shuffleWithFisherYates.ts';

export default class InventoryStore {
  static readonly INSTANCE = defineStore('inventory', () => {
    const store = new InventoryStore();
    const mainStore = MainStore.INSTANCE();
    store.initialize(mainStore.userTiles);
    return {
      anyTileIsPlaced: computed(() => store.anyTileIsPlaced),
      deselectTile: store.deselectTile.bind(store),
      initialize: () => {
        store.initialize(mainStore.userTiles);
      },
      isTileInRack: store.isTileInRack.bind(store),
      isTileSelected: store.isTileSelected.bind(store),
      isTileVisible: store.isTileVisible.bind(store),
      selectedTile: computed(() => store.selectedTile),
      selectedTileIsPlaced: computed(() => store.selectedTileIsPlaced),
      selectTile: store.selectTile.bind(store),
      shuffle: () => {
        store.shuffle();
      },
      switchTiles: (firstTile: GameTile, secondTile: GameTile) => {
        store.switchTiles(firstTile, secondTile);
      },
      tiles: store.tilesRef,
    };
  });

  private get anyTileIsPlaced(): boolean {
    return this.tiles.some(tile => this.mainStore.isTilePlaced(tile));
  }

  private get mainStore(): ReturnType<typeof MainStore.INSTANCE> {
    return MainStore.INSTANCE();
  }

  private get selectedTile(): GameTile | null {
    return this.selectedTileRef.value;
  }

  private get selectedTileIsPlaced(): boolean {
    return this.selectedTile !== null && this.mainStore.isTilePlaced(this.selectedTile);
  }

  private get tiles(): Array<GameTile> {
    return this.tilesRef.value;
  }

  private set tiles(newValue: Array<GameTile>) {
    this.tilesRef.value = newValue;
  }

  private constructor(
    private readonly tilesRef = shallowRef<Array<GameTile>>([]),
    private readonly selectedTileRef = ref<GameTile | null>(null),
  ) {}

  private deselectTile(): void {
    this.selectedTileRef.value = null;
  }

  private getTileIdx(tile: GameTile): number {
    return this.tiles.indexOf(tile);
  }

  private initialize(userTiles: ReadonlyArray<GameTile>): void {
    this.tiles.splice(0, this.tiles.length, ...userTiles);
    triggerRef(this.tilesRef);
    this.selectedTileRef.value = null;
  }

  private isTileInRack(tile: GameTile): boolean {
    return this.getTileIdx(tile) !== -1;
  }

  private isTileSelected(tile: GameTile): boolean {
    return this.selectedTile !== null && this.mainStore.areTilesSame(this.selectedTile, tile);
  }

  private isTileVisible(tile: GameTile): boolean {
    return this.isTileInRack(tile) && !this.mainStore.isTilePlaced(tile);
  }

  private selectTile(tile: GameTile): void {
    if (!this.isTileInRack(tile)) return;
    this.selectedTileRef.value = tile;
  }

  private shuffle(): void {
    shuffleWithFisherYates({ array: this.tiles });
    triggerRef(this.tilesRef);
  }

  private switchTiles(firstTile: GameTile, secondTile: GameTile): void {
    const firstIdx = this.getTileIdx(firstTile);
    const secondIdx = this.getTileIdx(secondTile);
    if (firstIdx < 0 || secondIdx < 0) throw new Error(`cannot switch tiles: ${firstTile} or ${secondTile} is not in rack`);
    const first = this.tiles[firstIdx];
    const second = this.tiles[secondIdx];
    if (first === undefined || second === undefined) {
      throw new Error(`expected tiles at rack indices ${String(firstIdx)} and ${String(secondIdx)}, got undefined`);
    }
    this.tiles[firstIdx] = second;
    this.tiles[secondIdx] = first;
    triggerRef(this.tilesRef);
  }
}
