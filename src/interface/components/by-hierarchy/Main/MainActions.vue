<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import { onMounted, onUnmounted, reactive } from 'vue';
import AppButton from '@/interface/components/shared/AppButton/AppButton.vue';
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
    keys: ['Enter'],
    name: window.text('game.action_play'),
  },
  {
    accent: Accent.Secondary,
    action: () => {
      void eventHandlers.handlePass();
    },
    isDisabled: () => allActionsAreDisabled.value,
    isRendered: () => true,
    keys: ['p'],
    name: window.text('game.action_pass'),
  },
  {
    accent: Accent.Secondary,
    action: () => {
      void eventHandlers.handleResign();
    },
    isDisabled: () => allActionsAreDisabled.value,
    isRendered: () => true,
    keys: ['r'],
    name: window.text('game.action_resign'),
  },
]);
function handleKeydown(event: KeyboardEvent): void {
  const item = items.find(item => 'keys' in item && item.keys.includes(event.key));
  if (item === undefined || item.isDisabled()) return;
  item.action();
}
onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <section class="actions">
    <ul class="actions__list">
      <li v-for="{ name, action, accent, isDisabled } in items" :key="name">
        <AppButton :accent="accent" :is-disabled="isDisabled()" @click="action()">
          {{ name }}
        </AppButton>
      </li>
    </ul>
  </section>
</template>

<style lang="scss" scoped>
.actions {
  z-index: var(--z-index-level-1);
  &__list {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
    padding: var(--space-m);
  }
}
</style>
