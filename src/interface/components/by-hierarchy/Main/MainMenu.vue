<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import { reactive } from 'vue';
import UseEventHandlers from '@/interface/composables/UseEventHandlers.ts';
import { Accent } from '@/interface/enums.ts';
import MainStore from '@/interface/stores/MainStore.ts';
const mainStore = MainStore.INSTANCE();
const eventHandlers = UseEventHandlers.create();
const { allActionsAreDisabled } = storeToRefs(mainStore);
const items = reactive([
  {
    accent: Accent.Primary,
    action: () => {
      eventHandlers.handleSave();
    },
    isDisabled: () => allActionsAreDisabled.value || !mainStore.currentTurnIsValid,
    name: window.text('game.action_play'),
  },
  {
    accent: Accent.Secondary,
    action: () => {
      void eventHandlers.handlePass();
    },
    isDisabled: () => allActionsAreDisabled.value,
    isRendered: () => true,
    name: window.text('game.action_pass'),
  },
  {
    accent: Accent.Secondary,
    action: () => {
      void eventHandlers.handleResign();
    },
    isDisabled: () => allActionsAreDisabled.value,
    isRendered: () => true,
    name: window.text('game.action_resign'),
  },
  // {
  //   accent: Accent.Secondary,
  //   action: () => {
  //     eventHandlers.handleShuffle();
  //   },
  //   isDisabled: () => allActionsAreDisabled.value,
  //   name: window.text('game.action_shuffle'),
  // },
  // {
  //   accent: Accent.Secondary,
  //   action: () => {
  //     eventHandlers.handleClearTiles();
  //   },
  //   isDisabled: () => allActionsAreDisabled.value,
  //   name: window.text('game.action_clear'),
  // },
]);
</script>

<template>
  <section>
    <ul class="menu">
      <li v-for="{ name, action, accent, isDisabled } in items" :key="name">
        <button
          :class="{
            menu__btn: true,
            'menu__btn--primary': accent === Accent.Primary,
            'menu__btn--secondary': accent === Accent.Secondary,
            'menu__btn--tertiary': accent === Accent.Tertiary,
          }"
          :disabled="isDisabled()"
          @click="action()"
        >
          {{ name }}
        </button>
      </li>
    </ul>
  </section>
</template>

<style lang="scss" scoped>
.menu {
  display: flex;
  flex-direction: column;
  gap: var(--space-s);
  padding: var(--space-m);
  &__btn {
    cursor: pointer;
    text-align: center;
    border-radius: var(--btn-radius);
    user-select: none;
    transition-property: box-shadow;
    transition-duration: var(--transition-duration);
    transition-timing-function: var(--transition-timing-function);
    border: 1px solid transparent;
    font-size: var(--btn-font-size);
    font-weight: var(--btn-font-weight);
    display: grid;
    place-items: center;
    width: 5rem;
    height: 2.25rem;
    $accents: 'primary', 'secondary', 'tertiary', 'quaternary';
    @each $accent in $accents {
      &--#{$accent} {
        background: var(--btn-bg-#{$accent});
        color: var(--btn-color-#{$accent});
        border-color: var(--btn-border-color-#{$accent});
        box-shadow: var(--shadow-xs);
        &:hover:not(:active):not(:disabled) {
          background: var(--btn-bg-#{$accent}-hover);
          color: var(--btn-color-#{$accent}-hover);
          border-color: var(--btn-border-color-#{$accent}-hover);
          box-shadow: var(--shadow-s);
        }
        &:active:not(:disabled) {
          background: var(--btn-bg-#{$accent}-active);
          color: var(--btn-color-#{$accent}-active);
          border-color: var(--btn-border-color-#{$accent}-active);
        }
      }
    }
    &:disabled {
      cursor: not-allowed;
      background: var(--btn-bg-disabled);
      color: var(--btn-color-disabled);
      border-color: var(--btn-border-color-disabled);
      box-shadow: none;
    }
  }
}
</style>
