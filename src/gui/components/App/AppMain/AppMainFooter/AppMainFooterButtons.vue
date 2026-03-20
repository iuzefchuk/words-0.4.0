<script lang="ts" setup>
import MatchStore from '@/gui/stores/MatchStore.ts';
import RackStore from '@/gui/stores/RackStore.ts';
import UseActions from '@/gui/composables/UseActions.ts';
import { reactive } from 'vue';
import { storeToRefs } from 'pinia';
const matchStore = MatchStore.INSTANCE();
const rackStore = RackStore.INSTANCE();
const { allTilesArePlaced } = storeToRefs(rackStore);
const actions = new UseActions();
const { allActionsAreDisabled } = actions;
const buttons = reactive([
  {
    name: window.t('game.action_resign'),
    action: () => actions.handleResign(),
    isRendered: () => true,
    isDisabled: () => allActionsAreDisabled.value,
  },
  {
    name: window.t('game.action_pass'),
    action: () => actions.handlePass(),
    isRendered: () => true,
    isDisabled: () => allActionsAreDisabled.value,
  },
  {
    name: window.t('game.action_shuffle'),
    action: () => actions.handleShuffle(),
    isRendered: () => allTilesArePlaced.value,
    isDisabled: () => allActionsAreDisabled.value,
  },
  {
    name: window.t('game.action_clear'),
    action: () => actions.handleClear(),
    isRendered: () => !allTilesArePlaced.value,
    isDisabled: () => allActionsAreDisabled.value,
  },
  {
    name: window.t('game.action_play'),
    action: () => actions.handlePlay(),
    isRendered: () => true,
    isDisabled: () => allActionsAreDisabled.value || !matchStore.currentTurnIsValid,
  },
]);
</script>

<template>
  <div class="actions">
    <ul class="actions__list app__width-content">
      <template v-for="{ name, action, isRendered, isDisabled } in buttons" :key="name">
        <li v-if="isRendered()" class="actions__list-item">
          <button class="actions__btn" :disabled="isDisabled()" @click="action()">
            {{ name }}
          </button>
        </li>
      </template>
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
      opacity: 0.7;
      cursor: not-allowed;
    }
  }
}
</style>
