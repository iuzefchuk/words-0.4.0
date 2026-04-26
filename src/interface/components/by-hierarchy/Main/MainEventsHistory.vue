<script lang="ts" setup>
import UseEventsHistory from '@/interface/composables/UseEventsHistory.ts';
const { history } = new UseEventsHistory();
</script>

<template>
  <TransitionGroup v-if="history.length > 0" name="fade-from-right" tag="ul" class="annotation app__make-secondary" appear>
    <li v-for="{ key, html } in history" :key="key" v-html="html" />
  </TransitionGroup>
</template>

<style lang="scss" scoped>
.annotation {
  $padding-right: calc(var(--grid-item-size) / 4);
  height: 6rem;
  border-right: 1px solid currentColor;
  padding-right: $padding-right;
  display: flex;
  flex-direction: column;
  gap: var(--space-s);
  overflow-y: auto;
  overflow-x: hidden;
  width: calc(100% - $padding-right);
  text-align: right;
  :deep(em) {
    font-style: italic;
  }
}
</style>
