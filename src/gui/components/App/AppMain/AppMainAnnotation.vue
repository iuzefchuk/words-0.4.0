<script lang="ts" setup>
import { computed } from 'vue';
import { AppTurnResolution } from '@/application/types.ts';
import MatchStore from '@/gui/stores/MatchStore.ts';
const MAX_LENGTH = 3;
const matchStore = MatchStore.INSTANCE();
const messages = computed(() => {
  const history = matchStore.turnResolutionHistory;
  const start = Math.max(0, history.length - MAX_LENGTH);
  return history.slice(start).map((resolution: AppTurnResolution, idx: number) => ({
    key: start + idx,
    html: convertResolutionToHtml(resolution),
  }));
});
function convertResolutionToHtml(resolution: AppTurnResolution): string {
  const { isSave, isUser } = resolution;
  if (isSave) {
    return window.t(isUser ? 'game.resolution_save_user' : 'game.resolution_save_opponent', {
      words: resolution.words!,
      score: resolution.score!,
    });
  } else {
    return window.t(isUser ? 'game.resolution_pass_user' : 'game.resolution_pass_opponent');
  }
}
</script>

<template>
  <TransitionGroup v-if="messages.length > 0" name="fade-from-left" tag="ul" class="annotation" appear>
    <li v-for="{ key, html } in messages" :key="key" v-html="html" />
  </TransitionGroup>
</template>

<style lang="scss" scoped>
.annotation {
  height: 6rem;
  border-left: 1px solid var(--secondary-color);
  padding-left: calc(var(--cell-tile-width) / 4);
  padding-right: calc(var(--cell-tile-width) / 2);
  display: flex;
  flex-direction: column;
  gap: var(--space-s);
  color: var(--secondary-color);
  font-size: var(--font-size-small);
  overflow-y: auto;
  overflow-x: hidden;
  width: 100%;
  :deep(em) {
    font-style: italic;
  }
}
</style>
