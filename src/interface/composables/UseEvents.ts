import { inject } from 'vue';
import { GameCell, GameMatchDifficulty, GameMatchType, GameTile } from '@/application/types/index.ts';
import ProvidesPlugin from '@/interface/plugins/ProvidesPlugin.ts';
import SoundPlayer, { Sound } from '@/interface/services/SoundPlayer.ts';
import DialogStore from '@/interface/stores/DialogStore.ts';
import InventoryStore from '@/interface/stores/InventoryStore.ts';
import MainStore from '@/interface/stores/MainStore.ts';

export default class UseUserEvents {
  get selectedTile(): GameTile | null {
    return this.inventoryStore.selectedTile;
  }

  private get dialogStore(): ReturnType<typeof DialogStore.INSTANCE> {
    return DialogStore.INSTANCE();
  }

  private get inventoryStore(): ReturnType<typeof InventoryStore.INSTANCE> {
    return InventoryStore.INSTANCE();
  }

  private get mainStore(): ReturnType<typeof MainStore.INSTANCE> {
    return MainStore.INSTANCE();
  }

  private constructor(private readonly resignDelayMs: number) {}

  static create(): UseUserEvents {
    const transitionDurationMs = inject(ProvidesPlugin.TRANSITION_DURATION_MS_KEY, 0);
    const resignDelayMs = transitionDurationMs * 2;
    return new UseUserEvents(resignDelayMs);
  }

  handleChangeMatchDifficulty(matchDifficulty: GameMatchDifficulty): void {
    this.mainStore.changeMatchDifficulty(matchDifficulty);
  }

  handleChangeMatchType(matchType: GameMatchType): void {
    this.mainStore.changeMatchType(matchType);
    this.inventoryStore.initialize();
  }

  handleClearTiles(): void {
    this.mainStore.clearTiles();
    this.inventoryStore.initialize();
    SoundPlayer.play(Sound.SystemClear);
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

  handleClickRackCell(idx: number): void {
    const tile = this.inventoryStore.tiles[idx];
    if (tile === undefined) throw new ReferenceError(`expected tile at rack index ${String(idx)}, got undefined`);
    const selected = this.selectedTile;
    if (selected === null) {
      if (this.mainStore.isTilePlaced(tile)) this.mainStore.undoPlaceTile(tile);
      return;
    }
    if (this.inventoryStore.selectedTileIsPlaced) this.mainStore.undoPlaceTile(selected);
    this.inventoryStore.switchTiles(selected, tile);
    this.inventoryStore.deselectTile();
  }

  handleClickRackTile(tile: GameTile): void {
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

  async handlePass(): Promise<void> {
    if (this.mainStore.userPassWillBeResign) return this.handleResign();
    const { isConfirmed } = await this.triggerPassDialog();
    if (!isConfirmed) return;
    this.mainStore.pass();
  }

  async handleResign(): Promise<void> {
    const { isConfirmed } = await this.triggerResignDialog();
    if (!isConfirmed) return;
    setTimeout(() => {
      this.mainStore.resign();
    }, this.resignDelayMs);
  }

  handleRestartGame(): void {
    this.mainStore.restartGame();
    this.inventoryStore.initialize();
  }

  handleSave(): void {
    this.mainStore.save();
    this.inventoryStore.initialize();
  }

  handleShuffle(): void {
    this.inventoryStore.shuffle();
    SoundPlayer.play(Sound.SystemShuffle);
  }

  private async triggerPassDialog(): Promise<{ isCanceled: boolean; isConfirmed: boolean; isDismissed: boolean }> {
    return await this.dialogStore.trigger({
      cancelText: window.text('game.dialog_cancel'),
      confirmText: window.text('game.dialog_confirm'),
      html: window.text('game.dialog_html_pass'),
    });
  }

  private async triggerResignDialog(): Promise<{ isCanceled: boolean; isConfirmed: boolean; isDismissed: boolean }> {
    return await this.dialogStore.trigger({
      cancelText: window.text('game.dialog_cancel'),
      confirmText: window.text('game.dialog_confirm'),
      html: window.text('game.dialog_html_resign'),
    });
  }
}
