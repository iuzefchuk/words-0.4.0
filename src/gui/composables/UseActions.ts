import { computed } from 'vue';
import { Sound } from '@/gui/services/SoundPlayer.ts';
import DialogStore from '@/gui/stores/DialogStore.ts';
import MatchStore from '@/gui/stores/MatchStore.ts';
import RackStore from '@/gui/stores/RackStore.ts';

export default class UseActions {
  readonly allActionsAreDisabled = computed(() => !MatchStore.INSTANCE().currentPlayerIsUser);

  async handleResign(): Promise<void> {
    const { isConfirmed } = await this.triggerResignDialog();
    if (!isConfirmed) return;
    this.matchStore.resignGame();
  }

  async handlePass(): Promise<void> {
    if (this.matchStore.userPassWillBeResign) {
      const { isConfirmed } = await this.triggerResignDialog();
      if (!isConfirmed) return;
    }
    this.matchStore.passTurn();
  }

  handleShuffle(): void {
    this.rackStore.shuffle();
    this.matchStore.playSound(Sound.ActionMix);
  }

  handleClear(): void {
    this.matchStore.resetTurn();
    this.rackStore.initialize();
  }

  handlePlay(): void {
    this.matchStore.saveTurn();
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
    return await this.dialogStore.trigger({
      title: window.t('game.dialog_title'),
      html: window.t('game.dialog_html'),
      confirmText: window.t('game.dialog_confirm'),
      cancelText: window.t('game.dialog_cancel'),
    });
  }
}
