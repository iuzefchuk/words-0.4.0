import { GameCell, GameTile } from '@/domain/types/index.ts';
import InventoryStore from '@/presentation/stores/InventoryStore.ts';
import MainStore from '@/presentation/stores/MainStore.ts';

/**
 * Wires user interactions (clicks on board cells, board tiles, rack slots,
 * rack tiles) to the two stores. Every handler starts with a guard on the
 * interaction state (idle — no selection — vs. a tile is selected) and
 * branches to a small named operation. Each handler's operations are local
 * to that handler on purpose: the four handlers look superficially similar
 * but differ in how the target's own placement is resolved, and sharing a
 * helper historically hid those differences.
 */
export default class UseInventoryEvents {
  // TODO rename to UseEvents
  get selectedTile(): GameTile | null {
    return this.inventoryStore.selectedTile;
  }

  private get inventoryStore() {
    return InventoryStore.INSTANCE();
  }

  private get mainStore() {
    return MainStore.INSTANCE();
  }

  handleClickBoardCell(cell: GameCell): void {
    const selected = this.selectedTile;
    if (selected === null) return;
    if (this.mainStore.findTileOnCell(cell) !== undefined) return;
    if (this.inventoryStore.selectedTileIsPlaced) this.mainStore.undoPlaceTile(selected);
    this.mainStore.placeTile({ cell, tile: selected });
    this.inventoryStore.deselectTile();
  }

  handleClickBoardTile(tile: GameTile): void {
    if (!this.inventoryStore.isTileInRack(tile)) return;
    if (this.inventoryStore.isTileSelected(tile)) {
      this.inventoryStore.deselectTile();
      return;
    }
    const selected = this.selectedTile;
    if (selected === null) {
      this.inventoryStore.selectTile(tile);
      return;
    }
    const targetCell = this.mainStore.findCellWithTile(tile);
    if (targetCell === undefined) return;
    const selectedCell = this.mainStore.findCellWithTile(selected);
    if (selectedCell !== undefined) {
      this.mainStore.undoPlaceTile(selected);
      this.mainStore.undoPlaceTile(tile);
      this.mainStore.placeTile({ cell: selectedCell, tile });
      this.mainStore.placeTile({ cell: targetCell, tile: selected });
    } else {
      this.mainStore.undoPlaceTile(tile);
      this.mainStore.placeTile({ cell: targetCell, tile: selected });
      this.inventoryStore.switchTiles(selected, tile);
    }
    this.inventoryStore.deselectTile();
  }

  handleClickFooterCell(idx: number): void {
    const tile = this.inventoryStore.tiles[idx];
    if (tile === undefined) throw new ReferenceError('Tile must be defined');
    const selected = this.selectedTile;
    if (selected === null) {
      if (this.mainStore.isTilePlaced(tile)) this.mainStore.undoPlaceTile(tile);
      return;
    }
    if (this.inventoryStore.selectedTileIsPlaced) this.mainStore.undoPlaceTile(selected);
    this.inventoryStore.switchTiles(selected, tile);
    this.inventoryStore.deselectTile();
  }

  handleClickFooterTile(tile: GameTile): void {
    const selected = this.selectedTile;
    if (selected === null) {
      this.inventoryStore.selectTile(tile);
      return;
    }
    if (!this.inventoryStore.isTileSelected(tile)) {
      const selectedCell = this.mainStore.findCellWithTile(selected);
      if (selectedCell !== undefined) {
        this.mainStore.undoPlaceTile(selected);
        this.mainStore.placeTile({ cell: selectedCell, tile });
      }
      this.inventoryStore.switchTiles(selected, tile);
    }
    this.inventoryStore.deselectTile();
  }

  handleDoubleClickBoardTile(tile: GameTile): void {
    if (!this.inventoryStore.isTileInRack(tile)) return;
    this.inventoryStore.deselectTile();
    this.mainStore.undoPlaceTile(tile);
  }
}
