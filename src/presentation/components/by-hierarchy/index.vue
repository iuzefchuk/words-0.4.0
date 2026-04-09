<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import { inject, onMounted, ref, watch } from 'vue';
import Dialog from '@/presentation/components/by-hierarchy/Dialog.vue';
import Endscreen from '@/presentation/components/by-hierarchy/Endscreen.vue';
import Loader from '@/presentation/components/by-hierarchy/Loader/Loader.vue';
import Main from '@/presentation/components/by-hierarchy/Main/Main.vue';
import ProvidesPlugin from '@/presentation/plugins/ProvidesPlugin.ts';
import MainStore from '@/presentation/stores/MainStore.ts';
const mainStore = MainStore.INSTANCE();
const { matchIsFinished } = storeToRefs(mainStore);
const loaderIsActive = ref(true);
const mainIsRendered = ref(false);
const showEndscreen = ref(false);
const transitionDurationMs = inject(ProvidesPlugin.TRANSITION_DURATION_MS_KEY);
watch(matchIsFinished, finished => {
  showEndscreen.value = finished;
});
onMounted(() => {
  loaderIsActive.value = false;
});
</script>

<template>
  <div
    :class="{ index: true, 'index--blurred': showEndscreen }"
    :style="{
      ...(transitionDurationMs && {
        '--transition-duration': `${transitionDurationMs}ms`,
        '--transition-duration-half': `${transitionDurationMs / 2}ms`,
      }),
      '--cell-count-per-axis': mainStore.boardCellsPerAxis,
    }"
  >
    <Loader :is-active="loaderIsActive" @derendered="mainIsRendered = true" />
    <Main v-if="mainIsRendered" />
    <Dialog />
  </div>
  <Transition name="fade" appear>
    <Endscreen v-if="showEndscreen" />
  </Transition>
</template>

<style lang="scss">
@use '@/presentation/assets/css/adjustments.scss';
@use '@/presentation/assets/css/animations.scss';
@use '@/presentation/assets/css/app.scss';
@use '@/presentation/assets/css/colors.scss';
@use '@/presentation/assets/css/transitions.scss';
@use '@/presentation/assets/css/variables.scss';

.index {
  display: flex;
  flex-direction: column;
  align-items: center;
  transition-duration: var(--transition-duration);
  transition-timing-function: var(--transition-timing-function);
  transition-property: filter;
  &--blurred {
    filter: blur(0.5rem);
  }
}
</style>
