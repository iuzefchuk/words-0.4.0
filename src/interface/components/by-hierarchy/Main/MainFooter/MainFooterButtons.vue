<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import { reactive } from 'vue';
import UseEvents from '@/interface/composables/UseEvents';
import InventoryStore from '@/interface/stores/InventoryStore.ts';
import MainStore from '@/interface/stores/MainStore.ts';
const mainStore = MainStore.INSTANCE();
const inventoryStore = InventoryStore.INSTANCE();
const events = UseEvents.create();
const { anyTileIsPlaced } = storeToRefs(inventoryStore);
const { allActionsAreDisabled } = storeToRefs(mainStore);
const items = reactive([
  {
    action: () => {
      void events.handleResign();
    },
    isDisabled: () => allActionsAreDisabled.value,
    isRendered: () => true,
    name: window.text('game.action_resign'),
  },
  {
    action: () => {
      void events.handlePass();
    },
    isDisabled: () => allActionsAreDisabled.value,
    isRendered: () => true,
    name: window.text('game.action_pass'),
  },
  {
    action: () => {
      events.handleShuffle();
    },
    isDisabled: () => allActionsAreDisabled.value,
    isRendered: () => !anyTileIsPlaced.value,
    name: window.text('game.action_shuffle'),
  },
  {
    action: () => {
      events.handleClearTiles();
    },
    isDisabled: () => allActionsAreDisabled.value,
    isRendered: () => anyTileIsPlaced.value,
    name: window.text('game.action_clear'),
  },
  {
    action: () => {
      events.handleSave();
    },
    isDisabled: () => allActionsAreDisabled.value || !mainStore.currentTurnIsValid,
    isRendered: () => true,
    name: window.text('game.action_play'),
  },
]);
</script>

<template>
  <div class="buttons">
    <ul class="buttons__list app__limit-max-width app__btn">
      <template v-for="{ name, action, isRendered, isDisabled } in items" :key="name">
        <li v-if="isRendered()" class="buttons__list-item">
          <button class="buttons__btn" :disabled="isDisabled()" @click="action()">
            {{ name }}
          </button>
        </li>
      </template>
    </ul>
  </div>
</template>

<style lang="scss" scoped>
.buttons {
  $gap: var(--space-m);
  height: calc(var(--cell-tile-width) * 1.6);
  width: 100%;
  display: grid;
  place-items: center;
  &__list {
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
    gap: $gap;
    height: 100%;
  }
  &__list-item {
    width: calc((100% - $gap * 3) / 4);
  }
  &__btn {
    cursor: pointer;
    text-transform: uppercase;
    text-align: center;
    border-radius: var(--primary-border-radius);
    width: 100%;
    height: 100%;
    user-select: none;
    box-shadow: var(--btn-shadow);
    --shadow-color: var(--btn-shadow-color);
    transition-property: box-shadow;
    transition-duration: var(--transition-duration-half);
    transition-timing-function: var(--transition-timing-function);
    border: var(--primary-border);
    font-size: var(--btn-font-size);
    color: var(--btn-color);
    font-weight: var(--btn-font-weight);
    letter-spacing: 0.5px;
    background: var(--btn-bg);
    &:hover:not(:active):not(:disabled) {
      background: var(--btn-bg-hover);
      border-color: var(--btn-border-color-hover);
      box-shadow: var(--btn-shadow-hover);
      --shadow-color: var(--btn-shadow-color-hover);
    }
    &:active:not(:disabled) {
      background: var(--btn-bg-active);
      border-color: transparent;
      box-shadow: none;
    }
    &:disabled {
      background: transparent;
      border-color: transparent;
      box-shadow: none;
      cursor: not-allowed;
      text-shadow: none;
    }
  }
}
</style>
