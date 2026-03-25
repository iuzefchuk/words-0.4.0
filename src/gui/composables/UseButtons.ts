import { computed, inject } from 'vue';
import ProvidesPlugin from '@/gui/plugins/ProvidesPlugin.ts';
import SoundPlayer, { Sound } from '@/gui/services/SoundPlayer.ts';
import DialogStore from '@/gui/stores/DialogStore.ts';
import MatchStore from '@/gui/stores/MatchStore.ts';
import RackStore from '@/gui/stores/RackStore.ts';

export default class UseButtons {
  readonly allActionsAreDisabled = computed(() => !MatchStore.INSTANCE().currentPlayerIsUser);

  private constructor(private readonly resignDelayMs: number) {}

  static create(): UseButtons {
    const transitionDurationMs = inject(ProvidesPlugin.TRANSITION_DURATION_MS_KEY, 0);
    const resignDelayMs = transitionDurationMs * 2;
    return new UseButtons(resignDelayMs);
  }

  async handleResign(): Promise<void> {
    const { isConfirmed } = await this.triggerResignDialog();
    if (!isConfirmed) return;
    setTimeout(() => this.matchStore.resign(), this.resignDelayMs);
  }

  async handlePass(): Promise<void> {
    if (this.matchStore.userPassWillBeResign) {
      const { isConfirmed } = await this.triggerResignDialog();
      if (!isConfirmed) return;
    }
    this.matchStore.pass();
  }

  handleShuffle(): void {
    this.rackStore.shuffle();
    SoundPlayer.play(Sound.SystemShuffle);
  }

  handleClear(): void {
    this.matchStore.clearTiles();
    this.rackStore.initialize();
    SoundPlayer.play(Sound.SystemClear);
  }

  handlePlay(): void {
    this.matchStore.save();
    this.rackStore.initialize();
  }

  private get dialogStore() {
    return DialogStore.INSTANCE();
  }

  private get matchStore() {
    return MatchStore.INSTANCE();
  }

  private get rackStore() {
    return RackStore.INSTANCE();
  }

  private async triggerResignDialog() {
    SoundPlayer.play(Sound.SystemDialog);
    return await this.dialogStore.trigger({
      title: window.t('game.dialog_title'),
      html: window.t('game.dialog_html'),
      confirmText: window.t('game.dialog_confirm'),
      cancelText: window.t('game.dialog_cancel'),
    });
  }
}
