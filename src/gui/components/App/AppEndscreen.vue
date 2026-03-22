<script lang="ts" setup>
import MatchStore from '@/gui/stores/MatchStore.ts';
import { getMatchResultText } from '@/gui/mappings.ts';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
const { matchResult } = storeToRefs(MatchStore.INSTANCE());
const text = computed(() => (matchResult.value && getMatchResultText(matchResult.value)) || '');
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
