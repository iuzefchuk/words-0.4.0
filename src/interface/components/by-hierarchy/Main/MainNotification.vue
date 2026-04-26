<script lang="ts" setup>
import { computed } from 'vue';
import { launchError } from '@/interface/stores/MainStore.ts';
const message = computed(() =>
  launchError.value === null ? '' : window.text('game.error_launch', { error: launchError.value }),
);
</script>

<template>
  <Transition name="fade-down-up" appear>
    <section v-if="launchError" class="notification" role="alert" v-html="message" />
  </Transition>
</template>

<style lang="scss" scoped>
.notification {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  padding: var(--space-l);
  background: var(--notification-bg);
  color: var(--notification-color);
  text-align: center;
  z-index: var(--z-index-level-3);
}
</style>
