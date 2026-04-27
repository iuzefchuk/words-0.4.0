<script lang="ts" setup>
import { computed } from 'vue';
import { launchError } from '@/interface/stores/MainStore.ts';
const message = computed(() =>
  launchError.value === null ? '' : window.text('game.error_launch', { error: launchError.value }),
);
</script>

<template>
  <section v-if="launchError" class="error" role="alert" v-html="message" />
</template>

<style lang="scss" scoped>
.error {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  padding: var(--space-l);
  background: var(--error-bg);
  color: var(--error-color);
  text-align: center;
  z-index: var(--z-index-level-3);
}
</style>
