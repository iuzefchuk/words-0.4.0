<script lang="ts" setup>
import GameMain from '@/gui/components/Game/GameMain/GameMain.vue';
import GameDialog from '@/gui/components/Game/GameDialog.vue';
import GameEndscreen from '@/gui/components/Game/GameEndscreen.vue';
import GameLoader from '@/gui/components/Game/GameLoader.vue';
import GameToast from '@/gui/components/Game/GameToast.vue';
import { onMounted, ref, inject } from 'vue';
import { useStoreGame } from '@/gui/stores/GameStore';
import { storeToRefs } from 'pinia';
import { transitionDurationMsKey } from '@/gui/plugins/provides/index.ts';

const storeGame = useStoreGame();
const { gameIsFinished } = storeToRefs(storeGame);
const loaderIsActive = ref(true);
const mainIsRendered = ref(false);
const transitionDurationMs = inject(transitionDurationMsKey);

onMounted(() => {
  loaderIsActive.value = false;
});
</script>

<template>
  <div
    :class="{ game: true, 'game--blurred': gameIsFinished }"
    :style="{
      '--transition-duration': `${transitionDurationMs}ms`,
      '--cell-count-per-axis': Math.sqrt(storeGame.layoutCells.length),
    }"
  >
    <GameLoader :is-active="loaderIsActive" @derendered="mainIsRendered = true" />
    <GameMain v-if="mainIsRendered" />
    <GameDialog />
    <GameToast />
  </div>
  <GameEndscreen v-if="gameIsFinished" />
</template>

<style lang="scss">
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
  --tile-shadow-inset-elevated: var(--space-2xs);
  --header-height: 5.3rem;
  --score-color: var(--color-white);
  --score-bg: var(--color-purple-darker);
}
.game {
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
