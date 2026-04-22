<script lang="ts" setup>
import { computed, inject } from 'vue';
import Dialog from '@/interface/components/by-hierarchy/Dialog.vue';
import Loader from '@/interface/components/by-hierarchy/Loader.vue';
import Main from '@/interface/components/by-hierarchy/Main/Main.vue';
import ProvidesPlugin from '@/interface/plugins/ProvidesPlugin.ts';
const transitionDurationMs = inject(ProvidesPlugin.TRANSITION_DURATION_MS_KEY);
const style = computed(() => ({
  ...(transitionDurationMs !== undefined && {
    '--transition-duration': `${String(transitionDurationMs)}ms`,
    '--transition-duration-half': `${String(transitionDurationMs / 2)}ms`,
  }),
  '--cell-count-per-axis': 15, // TODO remove when implementing dynamic board sizes
}));
</script>

<template>
  <Suspense>
    <Main />
    <template #fallback><Loader /></template>
  </Suspense>
  <Transition name="fade" appear>
    <Dialog :style="style" />
  </Transition>
</template>

<style lang="scss">
@use '@/interface/assets/css/adjustments.scss';
@use '@/interface/assets/css/animations.scss';
@use '@/interface/assets/css/general.scss';
@use '@/interface/assets/css/colors.scss';
@use '@/interface/assets/css/transitions.scss';
@use '@/interface/assets/css/variables.scss';
</style>
