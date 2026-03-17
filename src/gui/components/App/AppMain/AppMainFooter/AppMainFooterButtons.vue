<script lang="ts" setup>
import ButtonsController from '@/gui/controllers/ButtonsController.ts';
import { reactive } from 'vue';

const controller = new ButtonsController();
const { allItemsAreConnected, isDisabled } = controller;
const actions = reactive([
  {
    name: window.t('game.action_resign'),
    action: controller.handleResign.bind(controller),
    get isRendered() {
      return true;
    },
  },
  {
    name: window.t('game.action_pass'),
    action: controller.handlePass.bind(controller),
    get isRendered() {
      return true;
    },
  },
  {
    name: window.t('game.action_shuffle'),
    action: controller.handleShuffle.bind(controller),
    get isRendered() {
      return allItemsAreConnected.value;
    },
  },
  {
    name: window.t('game.action_clear'),
    action: controller.handleClear.bind(controller),
    get isRendered() {
      return !allItemsAreConnected.value;
    },
  },
  {
    name: window.t('game.action_play'),
    action: controller.handlePlay.bind(controller),
    get isRendered() {
      return true;
    },
  },
]);
</script>

<template>
  <div class="actions">
    <ul class="actions__list app__width-content">
      <template v-for="{ name, action, isRendered } in actions" :key="name">
        <li v-if="isRendered" class="actions__list-item">
          <button class="actions__btn" :disabled="isDisabled" @click="action()">
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
    // background: var(--color-gray-faintest);
    width: 100%;
    height: 100%;
    font-weight: var(--font-weight);
    border: 1.5px solid var(--color-gray);
    // box-shadow: var(--box-shadow-level-1);
    user-select: none;
    transition-property: box-shadow, border-color;
    transition-duration: var(--transition-duration-half);
    transition-timing-function: var(--transition-timing-function);
    &:hover:not(:active):not(:disabled) {
      //  box-shadow: var(--box-shadow-level-1);
      border-color: var(--color-gray-lighter);
    }
    &:active:not(:disabled) {
      //  box-shadow: none;
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
