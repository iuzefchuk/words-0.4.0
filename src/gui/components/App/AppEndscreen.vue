<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { getMatchResultText } from '@/gui/mappings.ts';
import MatchStore from '@/gui/stores/MatchStore.ts';
const matchStore = MatchStore.INSTANCE();
const { matchResult, opponentScore, userScore } = storeToRefs(matchStore);
const text = computed(() => {
  if (matchResult.value === undefined) throw new Error('AppEndscreen should be rendered after match results assign');
  return getMatchResultText(matchResult.value, `${userScore.value} - ${opponentScore.value}`);
});
</script>

<template>
  <div class="endscreen">
    <p>{{ text }}</p>
  </div>
</template>

<style lang="scss">
.endscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: var(--z-index-level-3);
  font-size: var(--font-size-big);
  display: grid;
  place-items: center;
}
</style>
