<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import MatchStore from '@/gui/stores/MatchStore.ts';
const matchStore = MatchStore.INSTANCE();
const { matchResult } = storeToRefs(matchStore);
const text = computed(() => (matchResult.value && matchStore.getMatchResultText(matchResult.value)) || '');
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
  color: var(--primary-color);
}
</style>
