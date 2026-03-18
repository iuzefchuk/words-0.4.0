import { computed } from 'vue';
import DialogStore from '@/gui/stores/DialogStore.ts';
import MatchStore from '@/gui/stores/MatchStore.ts';
import RackStore from '@/gui/stores/RackStore.ts';
import ToastStore from '@/gui/stores/ToastStore.ts';

export default class UseActions {
  private get dialogStore() {
    return DialogStore.getInstance();
  }
  private get matchStore() {
    return MatchStore.getInstance();
  }
  private get rackStore() {
    return RackStore.getInstance();
  }
  private get toastStore() {
    return ToastStore.getInstance();
  }

  readonly allActionsAreDisabled = computed(() => !MatchStore.getInstance().currentPlayerIsUser);

  async handleResign(): Promise<void> {
    const { isConfirmed } = await this.triggerResignDialog();
    if (!isConfirmed) return;
    this.matchStore.resignGame();
  }

  async handlePass(): Promise<void> {
    if (this.matchStore.userPassWillBeResign) {
      const { isConfirmed } = await this.triggerResignDialog();
      if (!isConfirmed) return;
    } else {
      this.toastStore.addMessage('you passed');
    }
    this.matchStore.passTurn();
  }

  handleShuffle(): void {
    this.matchStore.shuffleUserTiles();
    this.rackStore.initialize();
  }

  handleClear(): void {
    this.rackStore.initialize();
    this.matchStore.resetTurn();
  }

  handlePlay(): void {
    const { result, opponentTurn } = this.matchStore.saveTurn();
    if (!result.ok) this.toastStore.addMessage(result.error);
    else this.toastStore.addMessage(result.value.words.join(','));
    this.rackStore.initialize();
    opponentTurn?.then(opponentResult => {
      if (opponentResult.ok && opponentResult.value.words.length > 0) {
        this.toastStore.addMessage(opponentResult.value.words.join(','));
      } else {
        this.toastStore.addMessage('opponent passed');
      }
    });
  }

  private async triggerResignDialog() {
    return await this.dialogStore.trigger({ html: 'resigning', title: 'u sure?' });
  }
}
