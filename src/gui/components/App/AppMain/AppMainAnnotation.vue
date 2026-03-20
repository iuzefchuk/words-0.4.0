<script lang="ts" setup>
import { computed } from 'vue';
import MatchStore from '@/gui/stores/MatchStore.ts';
import { GameOutcome } from '@/application/Game.ts';
const MAX_LENGTH = 3;
const matchStore = MatchStore.INSTANCE();
const messages = computed(() => {
  const history = matchStore.outcomeHistory;
  const start = Math.max(0, history.length - MAX_LENGTH);
  return history.slice(start).map((outcome, i) => ({
    key: start + i,
    html: convertOutcomeToHtml(outcome),
  }));
});
function convertOutcomeToHtml(outcome: GameOutcome): string {
  const { isSave, isUser } = outcome;
  if (isSave) {
    return window.t(isUser ? 'game.outcome_save_user' : 'game.outcome_save_opponent', {
      words: outcome.words!,
      score: outcome.score!,
    });
  } else {
    return window.t(isUser ? 'game.outcome_pass_user' : 'game.outcome_pass_opponent');
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
  color: var(--secondary-color);
  height: 6rem;
  border-left: 1px solid var(--secondary-color);
  padding-left: calc(var(--cell-tile-width) / 4);
  padding-right: calc(var(--cell-tile-width) / 2);
  display: flex;
  flex-direction: column;
  gap: var(--space-s);
  font-size: var(--font-size-small);
  overflow-y: auto;
  overflow-x: hidden;
  width: 100%;
  :deep(em) {
    font-style: italic;
  }
}
</style>
