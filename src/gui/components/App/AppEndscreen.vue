<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { getMatchResultText } from '@/gui/mappings.ts';
import MatchStore from '@/gui/stores/MatchStore.ts';
const matchStore = MatchStore.INSTANCE();
const { matchResult, opponentScore, userScore } = storeToRefs(matchStore);
const scoreDifference = Math.abs(userScore.value - opponentScore.value);
const text = computed(() => {
  if (matchResult.value === undefined) throw new Error('AppEndscreen should be rendered after match results assign');
  return getMatchResultText(matchResult.value, scoreDifference);
});
</script>

<template>
  <div class="endscreen">{{ text }}</div>
</template>

<style lang="scss">
.endscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  z-index: var(--z-index-level-3);
  font-size: var(--font-size-big);
}
</style>
