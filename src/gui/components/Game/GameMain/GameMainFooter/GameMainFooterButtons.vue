<script lang="ts" setup>
import { useStoreDialog } from '@/gui/stores/DialogStore';
import { useStoreGame } from '@/gui/stores/GameStore';
import { useStoreInventory } from '@/gui/stores/Inventory';
import { useStoreToast } from '@/gui/stores/ToastStore';
import { storeToRefs } from 'pinia';

const storeDialog = useStoreDialog();
const storeGame = useStoreGame();
const storeInventory = useStoreInventory();
const storeToast = useStoreToast();
const { actionsAreDisabled } = storeToRefs(storeGame);
const { isInventoryFull } = storeToRefs(storeInventory);
const { willUserPassBeResign, shuffleUserTiles, passTurn, resignGame } = storeGame;

async function triggerResignDialog() {
  return await storeDialog.triggerDialog({ html: 'resigning', title: 'u sure?' });
}

async function handleResign(): Promise<void> {
  const { isConfirmed } = await triggerResignDialog();
  if (!isConfirmed) return;
  resignGame();
}

async function handlePass(): Promise<void> {
  if (willUserPassBeResign) {
    const { isConfirmed } = await triggerResignDialog();
    if (!isConfirmed) return;
  } else {
    storeToast.addToast({ html: 'you passed' });
  }
  passTurn();
}

function handleClear(): void {
  storeInventory.init();
  storeGame.resetTurn();
}

async function handlePlay() {
  const error = await storeGame.saveTurn({
    afterSaveCallback: (wordList: Array<string>) => {
      storeGame.resetTurn();
      storeToast.addToast({ html: wordList.join(',') });
    },
  });
  if (error) storeToast.addToast({ html: error });
  storeInventory.init();
}
</script>

<template>
  <div class="actions__wrapper">
    <ul class="actions__list game__width-content">
      <li class="actions__list-item">
        <button class="actions__btn" :disabled="actionsAreDisabled" @click="handleResign()">
          {{ t('game.action_resign') }}
        </button>
      </li>
      <li class="actions__list-item">
        <button class="actions__btn" :disabled="actionsAreDisabled" @click="handlePass()">
          {{ t('game.action_pass') }}
        </button>
      </li>
      <li v-if="isInventoryFull" class="actions__list-item">
        <button class="actions__btn" :disabled="actionsAreDisabled" @click="shuffleUserTiles()">
          {{ t('game.action_shuffle') }}
        </button>
      </li>
      <li v-else class="actions__list-item">
        <button class="actions__btn" :disabled="actionsAreDisabled" @click="handleClear()">
          {{ t('game.action_clear') }}
        </button>
      </li>
      <li class="actions__list-item">
        <button class="actions__btn" :disabled="actionsAreDisabled" @click="handlePlay()">
          {{ t('game.action_play') }}
        </button>
      </li>
    </ul>
  </div>
</template>

<style lang="scss" scoped>
.actions {
  &__wrapper {
    height: calc(var(--cell-tile-width) * 1.5);
    width: 100%;
    display: grid;
    place-items: center;
  }
  &__list {
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
    gap: var(--space-s);
    height: 100%;
  }
  &__list-item {
    width: 25%;
  }
  &__btn {
    cursor: pointer;
    text-align: center;
    background: var(--color-white);
    border-radius: var(--primary-border-radius);
    box-shadow: var(--box-shadow-level-0);
    width: 100%;
    height: 100%;
    border: 1px solid var(--color-gray-lightest);
    user-select: none;
    transition-property: box-shadow, border-color;
    transition-duration: var(--transition-duration);
    transition-timing-function: var(--transition-timing-function);
    &:hover:not(:active):not(:disabled) {
      box-shadow: var(--box-shadow-level-1);
      border-color: var(--color-gray-lighter);
    }
    &:active:not(:disabled) {
      box-shadow: none;
    }
    &:focus:not(:active):not(:disabled) {
      outline-offset: 1px;
      outline: 1.5px solid var(--color-purple-dark);
      transition-duration: calc(var(--transition-duration) / 2);
    }
    &:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
  }
}
</style>
