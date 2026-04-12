import { inject } from 'vue';
import ProvidesPlugin from '@/presentation/plugins/ProvidesPlugin.ts';
import SoundPlayer, { Sound } from '@/presentation/services/SoundPlayer.ts';
import DialogStore from '@/presentation/stores/DialogStore.ts';
import InventoryStore from '@/presentation/stores/InventoryStore.ts';
import MainStore from '@/presentation/stores/MainStore.ts';

// TODO merge into UseInventoryEvents

export default class UseActions {
  private get dialogStore() {
    return DialogStore.INSTANCE();
  }

  private get inventoryStore() {
    return InventoryStore.INSTANCE();
  }

  private get mainStore() {
    return MainStore.INSTANCE();
  }

  private constructor(private readonly resignDelayMs: number) {}

  static create(): UseActions {
    const transitionDurationMs = inject(ProvidesPlugin.TRANSITION_DURATION_MS_KEY, 0);
    const resignDelayMs = transitionDurationMs * 2;
    return new UseActions(resignDelayMs);
  }

  handleClear(): void {
    this.mainStore.clearTiles();
    this.inventoryStore.initialize();
    SoundPlayer.play(Sound.SystemClear);
  }

  handleGameRestart(): void {
    this.mainStore.restartGame();
    this.inventoryStore.initialize();
  }

  async handlePass(): Promise<void> {
    if (this.mainStore.userPassWillBeResign) return this.handleResign();
    const { isConfirmed } = await this.triggerPassDialog();
    if (!isConfirmed) return;
    this.mainStore.pass();
  }

  handlePlay(): void {
    this.mainStore.save();
    this.inventoryStore.initialize();
  }

  async handleResign(): Promise<void> {
    const { isConfirmed } = await this.triggerResignDialog();
    if (!isConfirmed) return;
    setTimeout(() => this.mainStore.resign(), this.resignDelayMs);
  }

  handleShuffle(): void {
    this.inventoryStore.shuffle();
    SoundPlayer.play(Sound.SystemShuffle);
  }

  private async triggerPassDialog() {
    SoundPlayer.play(Sound.SystemDialog);
    return await this.dialogStore.trigger({
      cancelText: window.t('game.dialog_cancel'),
      confirmText: window.t('game.dialog_confirm'),
      html: window.t('game.dialog_html_pass'),
    });
  }

  private async triggerResignDialog() {
    SoundPlayer.play(Sound.SystemDialog);
    return await this.dialogStore.trigger({
      cancelText: window.t('game.dialog_cancel'),
      confirmText: window.t('game.dialog_confirm'),
      html: window.t('game.dialog_html_resign'),
    });
  }
}
