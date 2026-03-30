<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import { reactive } from 'vue';
import UseButtons from '@/gui/composables/UseButtons.ts';
import MatchStore from '@/gui/stores/MatchStore.ts';
import RackStore from '@/gui/stores/RackStore.ts';
const matchStore = MatchStore.INSTANCE();
const rackStore = RackStore.INSTANCE();
const { anyTileIsPlaced } = storeToRefs(rackStore);
const buttons = UseButtons.create();
const { allActionsAreDisabled } = buttons;
const items = reactive([
  {
    name: window.t('game.action_resign'),
    action: () => buttons.handleResign(),
    isRendered: () => true,
    isDisabled: () => allActionsAreDisabled.value,
  },
  {
    name: window.t('game.action_pass'),
    action: () => buttons.handlePass(),
    isRendered: () => true,
    isDisabled: () => allActionsAreDisabled.value,
  },
  {
    name: window.t('game.action_shuffle'),
    action: () => buttons.handleShuffle(),
    isRendered: () => !anyTileIsPlaced.value,
    isDisabled: () => allActionsAreDisabled.value,
  },
  {
    name: window.t('game.action_clear'),
    action: () => buttons.handleClear(),
    isRendered: () => anyTileIsPlaced.value,
    isDisabled: () => allActionsAreDisabled.value,
  },
  {
    name: window.t('game.action_play'),
    action: () => buttons.handlePlay(),
    isRendered: () => true,
    isDisabled: () => allActionsAreDisabled.value || !matchStore.currentTurnIsValid,
  },
]);
</script>

<template>
  <div class="buttons">
    <ul class="buttons__list app__width-content">
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
    text-align: center;
    border-radius: var(--primary-border-radius);
    width: 100%;
    height: 100%;
    font-weight: var(--font-weight);
    border: var(--primary-border);
    user-select: none;
    transition-property: box-shadow;
    transition-duration: var(--transition-duration-half);
    transition-timing-function: var(--transition-timing-function);
    &:hover:not(:active):not(:disabled) {
      background: var(--button-bg-hover);
    }
    &:active:not(:disabled) {
      background: var(--button-bg-active);
    }
    &:disabled {
      border-color: transparent;
      opacity: var(--opacity-disabled);
      cursor: not-allowed;
    }
  }
}
</style>
