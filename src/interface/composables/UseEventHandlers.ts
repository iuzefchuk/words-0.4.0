import { inject } from 'vue';
import { GameCell, GameTile } from '@/domain/types/index.ts';
import ProvidesPlugin from '@/interface/plugins/ProvidesPlugin.ts';
import SoundPlayer, { Sound } from '@/interface/services/SoundPlayer.ts';
import ApplicationStore from '@/interface/stores/ApplicationStore.ts';
import DialogStore from '@/interface/stores/DialogStore.ts';
import InventoryStore from '@/interface/stores/InventoryStore.ts';

export default class UseEventHandlers {
  get selectedTile(): GameTile | null {
    return this.inventoryStore.selectedTile;
  }

  private get applicationStore(): ReturnType<typeof ApplicationStore.INSTANCE> {
    return ApplicationStore.INSTANCE();
  }

  private get dialogStore(): ReturnType<typeof DialogStore.INSTANCE> {
    return DialogStore.INSTANCE();
  }

  private get inventoryStore(): ReturnType<typeof InventoryStore.INSTANCE> {
    return InventoryStore.INSTANCE();
  }

  private constructor(private readonly resignDelayMs: number) {}

  static create(): UseEventHandlers {
    const transitionDurationMs = inject(ProvidesPlugin.TRANSITION_DURATION_MS_KEY, 0);
    const resignDelayMs = transitionDurationMs * 2;
    return new UseEventHandlers(resignDelayMs);
  }

  handleClear(): void {
    this.applicationStore.clearTiles();
    this.inventoryStore.initialize();
    SoundPlayer.play(Sound.SystemClear);
  }

  handleClickBoardCell(cell: GameCell): void {
    const selected = this.selectedTile;
    if (selected === null) return;
    if (this.applicationStore.findTileOnCell(cell) !== undefined) return;
    if (this.inventoryStore.selectedTileIsPlaced) this.applicationStore.undoPlaceTile(selected);
    this.applicationStore.placeTile({ cell, tile: selected });
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
    const targetCell = this.applicationStore.findCellWithTile(tile);
    if (targetCell === undefined) return;
    const selectedCell = this.applicationStore.findCellWithTile(selected);
    if (selectedCell !== undefined) {
      this.applicationStore.undoPlaceTile(selected);
      this.applicationStore.undoPlaceTile(tile);
      this.applicationStore.placeTile({ cell: selectedCell, tile });
      this.applicationStore.placeTile({ cell: targetCell, tile: selected });
    } else {
      this.applicationStore.undoPlaceTile(tile);
      this.applicationStore.placeTile({ cell: targetCell, tile: selected });
      this.inventoryStore.switchTiles(selected, tile);
    }
    this.inventoryStore.deselectTile();
  }

  handleClickRackCell(idx: number): void {
    const tile = this.inventoryStore.tiles[idx];
    if (tile === undefined) throw new ReferenceError(`expected tile at rack index ${String(idx)}, got undefined`);
    const selected = this.selectedTile;
    if (selected === null) {
      if (this.applicationStore.isTilePlaced(tile)) this.applicationStore.undoPlaceTile(tile);
      return;
    }
    if (this.inventoryStore.selectedTileIsPlaced) this.applicationStore.undoPlaceTile(selected);
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
      const selectedCell = this.applicationStore.findCellWithTile(selected);
      if (selectedCell !== undefined) {
        this.applicationStore.undoPlaceTile(selected);
        this.applicationStore.placeTile({ cell: selectedCell, tile });
      }
      this.inventoryStore.switchTiles(selected, tile);
    }
    this.inventoryStore.deselectTile();
  }

  handleDoubleClickBoardTile(tile: GameTile): void {
    if (!this.inventoryStore.isTileInRack(tile)) return;
    this.inventoryStore.deselectTile();
    this.applicationStore.undoPlaceTile(tile);
  }

  handleGameRestart(): void {
    this.applicationStore.restartGame();
    this.inventoryStore.initialize();
  }

  async handlePass(): Promise<void> {
    if (this.applicationStore.userPassWillBeResign) return this.handleResign();
    const { isConfirmed } = await this.triggerPassDialog();
    if (!isConfirmed) return;
    this.applicationStore.pass();
  }

  handlePlay(): void {
    this.applicationStore.save();
    this.inventoryStore.initialize();
  }

  async handleResign(): Promise<void> {
    const { isConfirmed } = await this.triggerResignDialog();
    if (!isConfirmed) return;
    setTimeout(() => {
      this.applicationStore.resign();
    }, this.resignDelayMs);
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
