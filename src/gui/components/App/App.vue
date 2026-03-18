<script lang="ts" setup>
import AppMain from '@/gui/components/App/AppMain/AppMain.vue';
import AppDialog from '@/gui/components/App/AppDialog.vue';
import AppEndscreen from '@/gui/components/App/AppEndscreen.vue';
import AppLoader from '@/gui/components/App/AppLoader.vue';
import AppToast from '@/gui/components/App/AppToast.vue';
import { onMounted, ref, inject } from 'vue';
import GameStore from '@/gui/stores/GameStore.ts';
import { storeToRefs } from 'pinia';
import { transitionDurationMsKey } from '@/gui/plugins/provides/index.ts';
const gameStore = GameStore.getInstance();
const { gameIsFinished } = storeToRefs(gameStore);
const loaderIsActive = ref(true);
const mainIsRendered = ref(false);
const transitionDurationMs = inject(transitionDurationMsKey);

onMounted(() => {
  loaderIsActive.value = false;
});
</script>

<template>
  <div
    :class="{ app: true, 'app--blurred': gameIsFinished }"
    :style="{
      ...(transitionDurationMs && {
        '--transition-duration': `${transitionDurationMs}ms`,
        '--transition-duration-half': `${transitionDurationMs / 2}ms`,
      }),
      '--cell-count-per-axis': Math.sqrt(gameStore.layoutCells.length),
    }"
  >
    <AppLoader :is-active="loaderIsActive" @derendered="mainIsRendered = true" />
    <AppMain v-if="mainIsRendered" />
    <AppDialog />
    <AppToast />
  </div>
  <AppEndscreen v-if="gameIsFinished" />
</template>

<style lang="scss">
@use '@/gui/assets/css/adjustments.scss';
@use '@/gui/assets/css/animations.scss';
@use '@/gui/assets/css/colors.scss';
@use '@/gui/assets/css/transitions.scss';
@use '@/gui/assets/css/variables.scss';

:root {
  --primary-color: var(--color-gray-darkest);
  --primary-bg: var(--color-gray-fainter);
  --primary-padding: var(--space-s);
  --primary-border-radius: var(--space-xs);
  --cell-color-dw: var(--color-blue);
  --cell-color-tw: var(--color-red);
  --cell-color-dl: var(--color-green);
  --cell-color-tl: var(--color-yellow);
  --cell-bg: var(--color-white);
  --cell-bg-center: var(--color-purple-light);
  --cell-bg-footer: var(--color-gray-faint);
  --cell-tile-width: var(--space-4xl);
  --cell-tile-gap: var(--space-2xs);
  --tile-color: var(--color-gray-darkest);
  --tile-color-inverted: var(--color-gray-fainter);
  --tile-bg: var(--color-pink);
  --tile-bg-inverted: var(--color-purple-dark);
  --tile-bg-highlighted: var(--color-pink-saturated);
  --tile-shadow-color: var(--color-purple);
  --tile-shadow-color-inverted: var(--color-purple-darker);
  --tile-shadow-inset-elevated: var(--space-xs);
  --header-height: 5.3rem;
}
.app {
  color: var(--primary-color);
  background: var(--primary-bg);
  font-size: var(--font-size);
  font-weight: var(--font-weight-small);
  display: flex;
  flex-direction: column;
  align-items: center;
  &--blurred {
    filter: blur(0.1rem);
  }
  &__width-content {
    max-width: calc(var(--cell-count-per-axis) * (var(--cell-tile-gap) + var(--cell-tile-width)));
    width: 100%;
  }
  &__grid {
    @mixin grid($columns, $rows, $gap: var(--cell-tile-gap)) {
      display: grid;
      grid-template-columns: repeat($columns, minmax(0, 1fr));
      grid-template-rows: repeat($rows, minmax(0, 1fr));
      gap: $gap;
      > * {
        position: relative;
        aspect-ratio: 1 / 1;
        > * {
          position: absolute;
          inset: 0;
        }
      }
    }
    &--board {
      @include grid(var(--cell-count-per-axis), var(--cell-count-per-axis));
    }
    &--footer {
      @include grid(8, 1, calc(var(--cell-tile-gap) * 2));
    }
  }
}
</style>
