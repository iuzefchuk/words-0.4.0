<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import UseActions from '@/presentation/composables/UseActions.ts';
import { getMatchResultText } from '@/presentation/mappings.ts';
import MainStore from '@/presentation/stores/MainStore.ts';
const mainStore = MainStore.INSTANCE();
const actions = UseActions.create();
const { matchResult, opponentScore, userScore } = storeToRefs(mainStore);
const text = computed(() => getMatchResultText(matchResult.value, userScore.value - opponentScore.value));
</script>

<template>
  <button class="endscreen" @dblclick="actions.handleGameRestart()">
    <p class="endscreen__text">{{ text }}</p>
    <p class="endscreen__hint app__make-secondary">{{ t('game.action_new_match') }}</p>
  </button>
</template>

<style lang="scss" scoped>
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
  &__text {
    position: relative;
    user-select: none;
  }
  &__hint {
    $ms: calc(var(--transition-duration) * 10);
    animation: double-tap $ms var(--transition-timing-function) infinite;
    animation-delay: $ms;
    transform-origin: center;
    position: absolute;
    bottom: 45%;
    width: max-content;
    user-select: none;
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
