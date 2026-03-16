<script lang="ts" setup>
import GameStore from '@/gui/stores/GameStore.ts';
import { storeToRefs } from 'pinia';
const storeGame = GameStore.getInstance();
const { currentTurnScore } = storeToRefs(storeGame);
</script>

<template>
  <div v-if="currentTurnScore" class="tooltip">{{ currentTurnScore }}</div>
</template>

<style lang="scss" scoped>
.tooltip {
  position: absolute;
  inset: auto;
  bottom: var(--space-l);
  right: calc(-1 * var(--space-xl));
  width: max-content;
  height: max-content;
  padding: var(--space-3xs);
  z-index: var(--z-index-level-1);
  font-weight: var(--font-weight);
}
</style>
