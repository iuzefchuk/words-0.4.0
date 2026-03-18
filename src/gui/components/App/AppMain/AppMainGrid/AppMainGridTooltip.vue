<script lang="ts" setup>
import MatchStore from '@/gui/stores/MatchStore.ts';
import { storeToRefs } from 'pinia';
const matchStore = MatchStore.getInstance();
const { currentTurnScore } = storeToRefs(matchStore);
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
