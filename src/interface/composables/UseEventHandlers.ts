import { GameCell, GameMatchDifficulty, GameMatchType, GameTile } from '@/application/types/index.ts';
import SoundPlayer, { Sound } from '@/interface/services/SoundPlayer.ts';
import DialogStore from '@/interface/stores/DialogStore.ts';
import MainStore from '@/interface/stores/MainStore.ts';
import UserStore from '@/interface/stores/UserStore.ts';

export default class UseEventHandlers {
  private static readonly RESIGN_DELAY_MS = 500;

  get selectedTile(): GameTile | null {
    return this.userStore.selectedTile;
  }

  private get dialogStore(): ReturnType<typeof DialogStore.INSTANCE> {
    return DialogStore.INSTANCE();
  }

  private get mainStore(): ReturnType<typeof MainStore.INSTANCE> {
    return MainStore.INSTANCE();
  }

  private get userStore(): ReturnType<typeof UserStore.INSTANCE> {
    return UserStore.INSTANCE();
  }

  static create(): UseEventHandlers {
    return new UseEventHandlers();
  }

  handleChangeMatchDifficulty(matchDifficulty: GameMatchDifficulty): void {
    this.mainStore.changeMatchDifficulty(matchDifficulty);
  }

  handleChangeMatchType(matchType: GameMatchType): void {
    this.mainStore.changeMatchType(matchType);
    this.userStore.initialize();
  }

  handleClearTiles(): void {
    this.mainStore.clearTiles();
    this.userStore.initialize();
    SoundPlayer.play(Sound.SystemClear);
  }

  handleClickBoardCell(cell: GameCell): void {
    const selected = this.selectedTile;
    if (selected === null) return;
    if (this.mainStore.findTileOnCell(cell) !== undefined) return;
    if (this.userStore.selectedTileIsPlaced) this.mainStore.undoPlaceTile(selected);
    this.mainStore.placeTile({ cell, tile: selected });
    this.userStore.deselectTile();
  }

  handleClickBoardTile(tile: GameTile): void {
    if (!this.userStore.isTileInInventory(tile)) return;
    if (this.userStore.isTileSelected(tile)) {
      this.userStore.deselectTile();
      return;
    }
    const selected = this.selectedTile;
    if (selected === null) {
      this.userStore.selectTile(tile);
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
      this.userStore.switchTiles(selected, tile);
    }
    this.userStore.deselectTile();
  }

  handleClickInventoryCell(idx: number): void {
    const tile = this.userStore.tiles[idx];
    if (tile === undefined) throw new ReferenceError(`expected tile at rack index ${String(idx)}, got undefined`);
    const selected = this.selectedTile;
    if (selected === null) {
      if (this.mainStore.isTilePlaced(tile)) this.mainStore.undoPlaceTile(tile);
      return;
    }
    if (this.userStore.selectedTileIsPlaced) this.mainStore.undoPlaceTile(selected);
    this.userStore.switchTiles(selected, tile);
    this.userStore.deselectTile();
  }

  handleClickInventoryTile(tile: GameTile): void {
    const selected = this.selectedTile;
    if (selected === null) {
      this.userStore.selectTile(tile);
      return;
    }
    if (!this.userStore.isTileSelected(tile)) {
      const selectedCell = this.mainStore.findCellWithTile(selected);
      if (selectedCell !== undefined) {
        this.mainStore.undoPlaceTile(selected);
        this.mainStore.placeTile({ cell: selectedCell, tile });
      }
      this.userStore.switchTiles(selected, tile);
    }
    this.userStore.deselectTile();
  }

  handleDoubleClickBoardTile(tile: GameTile): void {
    if (!this.userStore.isTileInInventory(tile)) return;
    this.userStore.deselectTile();
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
    }, UseEventHandlers.RESIGN_DELAY_MS);
  }

  handleRestartGame(): void {
    this.mainStore.restartGame();
    this.userStore.initialize();
  }

  handleSave(): void {
    this.mainStore.save();
    this.userStore.initialize();
  }

  handleShuffle(): void {
    this.userStore.shuffleTiles();
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
