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
  bottom: 25px;
  right: -19px;
  width: max-content;
  height: max-content;
  z-index: var(--z-index-level-1);
  padding: 2px 4px;
  border-radius: 2px;
  font-weight: var(--font-weight);
}
</style>
