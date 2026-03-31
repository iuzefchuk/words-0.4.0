<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import MatchStore from '@/gui/stores/MatchStore.ts';
const matchStore = MatchStore.INSTANCE();
const { currentTurnScore } = storeToRefs(matchStore);
const SHIMMER_THRESHOLD_SCORE = 29;
</script>

<template>
  <div v-if="currentTurnScore" class="tooltip">
    <div :class="{ tooltip__score: true, 'tooltip__score--shimmer': currentTurnScore > SHIMMER_THRESHOLD_SCORE }">
      {{ currentTurnScore }}
    </div>
  </div>
</template>

<style lang="scss" scoped>
.tooltip {
  position: absolute;
  inset: auto;
  bottom: var(--space-xl);
  left: var(--space-xl);
  width: var(--space-3xl);
  height: var(--space-3xl);
  z-index: var(--z-index-level-2);
  display: grid;
  place-items: center;
  &__score {
    width: max-content;
    height: max-content;
    padding: 0px var(--space-2xs);
    font-weight: var(--font-weight);
    background: var(--color-red);
    color: var(--color-white);
    border-radius: var(--primary-border-radius);
    font-size: var(--font-size-small);
    &--shimmer {
      background: linear-gradient(90deg, red, orange, yellow, green, cyan, blue, violet, red);
      background-size: 300% 100%;
      animation: shimmer 3s linear infinite;
    }
  }
}
</style>
