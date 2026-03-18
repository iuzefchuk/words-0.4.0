import { computed } from 'vue';
import DialogStore from '@/gui/stores/DialogStore.ts';
import GameStore from '@/gui/stores/GameStore.ts';
import ItemsStore from '@/gui/stores/ItemsStore.ts';
import ToastStore from '@/gui/stores/ToastStore.ts';

export default class UseActions {
  private get dialogStore() {
    return DialogStore.getInstance();
  }
  private get gameStore() {
    return GameStore.getInstance();
  }
  private get itemsStore() {
    return ItemsStore.getInstance();
  }
  private get toastStore() {
    return ToastStore.getInstance();
  }

  readonly allActionsAreDisabled = computed(() => !GameStore.getInstance().currentPlayerIsUser);

  async handleResign(): Promise<void> {
    const { isConfirmed } = await this.triggerResignDialog();
    if (!isConfirmed) return;
    this.gameStore.resignGame();
  }

  async handlePass(): Promise<void> {
    if (this.gameStore.userPassWillBeResign) {
      const { isConfirmed } = await this.triggerResignDialog();
      if (!isConfirmed) return;
    } else {
      this.toastStore.addMessage('you passed');
    }
    this.gameStore.passTurn();
  }

  handleShuffle(): void {
    this.gameStore.shuffleUserTiles();
    this.itemsStore.initialize();
  }

  handleClear(): void {
    this.itemsStore.initialize();
    this.gameStore.resetTurn();
  }

  handlePlay(): void {
    const { result, opponentTurn } = this.gameStore.saveTurn();
    if (!result.ok) this.toastStore.addMessage(result.error);
    else this.toastStore.addMessage(result.value.words.join(','));
    this.itemsStore.initialize();
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
