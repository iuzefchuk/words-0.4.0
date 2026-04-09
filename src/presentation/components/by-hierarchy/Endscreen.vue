<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { getMatchResultText } from '@/presentation/mappings.ts';
import MainStore from '@/presentation/stores/MainStore.ts';
const mainStore = MainStore.INSTANCE();
const { matchResult, opponentScore, userScore } = storeToRefs(mainStore);
const text = computed(() => {
  if (matchResult.value === undefined) throw new Error('AppEndscreen should be rendered after match results assign');
  return getMatchResultText(matchResult.value);
});
</script>

<template>
  <button class="endscreen" @dblclick="mainStore.restartGame">
    <p class="endscreen__score">{{ userScore }} - {{ opponentScore }}</p>
    <p>{{ text }}</p>
    <p class="endscreen__hint">{{ t('game.action_new_match') }}</p>
  </button>
</template>

<style lang="scss">
.endscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: var(--z-index-level-3);
  display: grid;
  place-items: center;
  gap: var(--space-m);
  align-content: center;
  font-size: var(--font-size-big);
  &__score {
    font-size: var(--font-size-bigger);
  }
  &__hint {
    animation: double-tap 3s var(--transition-timing-function) infinite;
    transform-origin: center;
  }
}

@keyframes double-tap {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  5% {
    transform: scale(0.9);
    opacity: 0.5;
  }
  10% {
    transform: scale(1);
    opacity: 1;
  }
  15% {
    transform: scale(0.9);
    opacity: 0.5;
  }
  20% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
