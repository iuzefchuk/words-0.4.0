<script lang="ts" setup>
import { ref, computed, watch, inject } from 'vue';
import { useCounter } from '@/gui/composables/counter.js';
import { GAME_LETTERS } from '@/application/index.js';
import GameTile from './GameTile.vue';
import { transitionDurationMsKey } from '@/gui/plugins/provides/index.js';

const transitionDurationMs = inject(transitionDurationMsKey, 0);
const { isActive } = defineProps({
  isActive: { type: Boolean, required: true },
});
const emit = defineEmits(['derendered']);
const DUMMY_LETTERS = [GAME_LETTERS.W, GAME_LETTERS.O, GAME_LETTERS.R, GAME_LETTERS.D, GAME_LETTERS.S];
const { counter, restartCounter, stopCounter } = useCounter(transitionDurationMs);
const isRendered = ref(false);
const onlyFirstTileIsElevated = computed(() =>
  DUMMY_LETTERS.every((letter, idx) => (idx === 0 ? isTileElevated(idx) : !isTileElevated(idx))),
);
const remainingCounterValue = computed(() => counter.value % (DUMMY_LETTERS.length + 1));
const allTilesAreHighlighted = computed(() => counter.value > 0 && remainingCounterValue.value === 0);

function initRenderWithCounter(): void {
  isRendered.value = true;
  restartCounter(onIncrementCounter);
}

function deinitRenderWithCounter(): void {
  isRendered.value = false;
  stopCounter();
  emit('derendered');
}

function onIncrementCounter(): void {
  if (counter.value <= 1) return;
  if (!isActive && onlyFirstTileIsElevated.value) deinitRenderWithCounter();
}

function isTileElevated(idx: number): boolean {
  return idx < remainingCounterValue.value;
}

watch(
  () => isActive,
  newValue => {
    if (newValue) initRenderWithCounter();
  },
  { immediate: true },
);
</script>

<template>
  <Transition name="fade">
    <div v-if="isRendered" class="loader">
      <div class="loader__logo">
        <GameTile
          v-for="(letter, idx) in DUMMY_LETTERS"
          :key="idx"
          class="loader__tile"
          :letter="letter"
          :is-highlighted="allTilesAreHighlighted"
          :is-elevated="isTileElevated(idx)"
        />
      </div>
    </div>
  </Transition>
</template>

<style lang="scss" scoped>
.loader {
  position: fixed;
  background: var(--color-gray-fainter);
  width: 100vw;
  height: 100vh;
  z-index: var(--z-index-level-3);
  display: grid;
  place-content: center;
  &__logo {
    display: flex;
    flex-direction: row;
    gap: var(--cell-tile-gap);
  }
  &__tile {
    pointer-events: none;
    width: var(--cell-tile-width);
    border-radius: var(--primary-border-radius);
  }
}
</style>
