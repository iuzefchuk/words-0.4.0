<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import MainStore from '@/interface/stores/MainStore.ts';
const { bootError } = storeToRefs(MainStore.INSTANCE());
const message = computed(() => (bootError.value === null ? '' : window.text('game.error_launch', { error: bootError.value })));
</script>

<template>
  <section v-if="bootError" class="error" role="alert" v-html="message" />
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
