<script lang="ts" setup>
import DialogStore from '@/gui/stores/DialogStore.ts';
import GameStore from '@/gui/stores/GameStore.ts';
import ItemsStore from '@/gui/stores/ItemsStore.ts';
import ToastStore from '@/gui/stores/ToastStore.ts';
import { storeToRefs } from 'pinia';

// TODO
const storeDialog = DialogStore.getInstance();
const storeGame = GameStore.getInstance();
const storeItems = ItemsStore.getInstance();
const storeToast = ToastStore.getInstance();
const { currentPlayerIsUser } = storeToRefs(storeGame);
const { allItemsAreConnected } = storeToRefs(storeItems);
// const { shuffleUserTiles } = storeGame;

async function triggerResignDialog() {
  // return await storeDialog.triggerDialog({ html: 'resigning', title: 'u sure?' });
}

async function handleResign(): Promise<void> {
  storeToast.addMessage('Testing');
  // const { isConfirmed } = await triggerResignDialog();
  // if (!isConfirmed) return;
  // resignGame();
}

async function handlePass(): Promise<void> {
  storeDialog.trigger({ html: 'Testing', title: 'Test' });
  // if (willUserPassBeResign) {
  //   const { isConfirmed } = await triggerResignDialog();
  //   if (!isConfirmed) return;
  // } else {
  //   storeToast.addToast({ html: 'you passed' });
  // }
  // passTurn();
}

function handleClear(): void {
  // storeItems.initialize();
  // storeGame.resetTurn();
}

async function handlePlay() {
  const error = await storeGame.saveTurn();
  if (error) storeToast.addMessage(error);
  storeItems.initialize();

  // afterSaveCallback: (words: Array<string>) => {
  //   storeToast.addMessage(words.join(','));
  // },;
}
</script>

<template>
  <div class="actions">
    <ul class="actions__list app__width-content">
      <li class="actions__list-item">
        <button class="actions__btn" :disabled="!currentPlayerIsUser" @click="handleResign()">
          {{ t('game.action_resign') }}
        </button>
      </li>
      <li class="actions__list-item">
        <button class="actions__btn" :disabled="!currentPlayerIsUser" @click="handlePass()">
          {{ t('game.action_pass') }}
        </button>
      </li>
      <li v-if="allItemsAreConnected" class="actions__list-item">
        <button class="actions__btn" :disabled="!currentPlayerIsUser">
          {{ t('game.action_shuffle') }}
        </button>
      </li>
      <li v-else class="actions__list-item">
        <button class="actions__btn" :disabled="!currentPlayerIsUser" @click="handleClear()">
          {{ t('game.action_clear') }}
        </button>
      </li>
      <li class="actions__list-item">
        <button class="actions__btn" :disabled="!currentPlayerIsUser" @click="handlePlay()">
          {{ t('game.action_play') }}
        </button>
      </li>
    </ul>
  </div>
</template>

<style lang="scss" scoped>
.actions {
  height: calc(var(--cell-tile-width) * 1.6);
  width: 100%;
  display: grid;
  place-items: center;
  &__list {
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
    gap: var(--space-m);
    height: 100%;
  }
  &__list-item {
    width: 25%;
  }
  &__btn {
    cursor: pointer;
    text-align: center;
    border-radius: var(--primary-border-radius);
    background: var(--color-gray-faintest);
    width: 100%;
    height: 100%;
    font-weight: var(--font-weight);
    border: 1px solid var(--color-gray);
    box-shadow: var(--box-shadow-level-1);
    user-select: none;
    transition-property: box-shadow, border-color;
    transition-duration: var(--transition-duration-half);
    transition-timing-function: var(--transition-timing-function);
    &:hover:not(:active):not(:disabled) {
      box-shadow: var(--box-shadow-level-1);
      border-color: var(--color-gray-lighter);
    }
    &:active:not(:disabled) {
      box-shadow: none;
    }
    // &:focus:not(:active):not(:disabled) {
    //   outline-offset: 1px;
    //   outline: 1.5px solid var(--color-purple-dark);
    //   transition-duration: calc(var(--transition-duration) / 2);
    // }
    &:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
  }
}
</style>
