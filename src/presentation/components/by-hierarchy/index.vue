<script lang="ts" setup>
import { computed, inject } from 'vue';
import Dialog from '@/presentation/components/by-hierarchy/Dialog.vue';
import Loader from '@/presentation/components/by-hierarchy/Loader.vue';
import Main from '@/presentation/components/by-hierarchy/Main/Main.vue';
import ProvidesPlugin from '@/presentation/plugins/ProvidesPlugin.ts';
const transitionDurationMs = inject(ProvidesPlugin.TRANSITION_DURATION_MS_KEY);
const style = computed(() => ({
  ...(transitionDurationMs && {
    '--transition-duration': `${transitionDurationMs}ms`,
    '--transition-duration-half': `${transitionDurationMs / 2}ms`,
  }),
  '--cell-count-per-axis': 15, // TODO replace this for boardCellsPerAxis
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
@use '@/presentation/assets/css/adjustments.scss';
@use '@/presentation/assets/css/animations.scss';
@use '@/presentation/assets/css/app.scss';
@use '@/presentation/assets/css/colors.scss';
@use '@/presentation/assets/css/transitions.scss';
@use '@/presentation/assets/css/variables.scss';
</style>
