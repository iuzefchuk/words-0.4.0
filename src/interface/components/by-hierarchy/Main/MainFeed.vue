<script lang="ts" setup>
import UseHistory from '@/interface/composables/UseHistory.ts';
const { history } = new UseHistory();
</script>

<template>
  <section v-if="history.length > 0" class="feed">
    <TransitionGroup name="fade-from-right" tag="ul" class="feed__list app__make-secondary" appear>
      <li v-for="{ key, html } in history" :key="key" v-html="html" />
    </TransitionGroup>
  </section>
</template>

<style lang="scss" scoped>
.feed {
  $padding-right: calc(var(--grid-item-size) / 4);
  width: calc(100% - $padding-right);
  &__list {
    height: 6rem;
    border-right: 1px solid currentColor;
    padding-right: $padding-right;
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
    overflow-y: auto;
    overflow-x: hidden;
    text-align: right;
    :deep(em) {
      font-style: italic;
    }
  }
}
</style>
