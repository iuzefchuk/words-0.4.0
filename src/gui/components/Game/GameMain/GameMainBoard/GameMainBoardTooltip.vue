<script lang="ts" setup>
import { useStoreGame } from '@/gui/stores/game.js';
import { storeToRefs } from 'pinia';

const storeGame = useStoreGame();
const { unsavedTurnScore } = storeToRefs(storeGame);
</script>

<template>
  <div v-if="unsavedTurnScore" class="score">{{ unsavedTurnScore }}</div>
</template>

<style lang="scss" scoped>
.score {
  position: absolute;
  inset: auto;
  bottom: -2px;
  right: -8px;
  width: max-content;
  height: max-content;
  z-index: var(--z-index-level-1);
  background: var(--score-bg);
  color: var(--score-color);
  font-weight: 300;
  font-size: var(--font-size-smaller);
  padding: 0 2px;
  border-radius: 2px;
}
</style>
