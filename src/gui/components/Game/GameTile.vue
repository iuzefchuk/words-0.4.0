<script lang="ts" setup>
import { watch, ref, inject } from 'vue';
import { getLetterSvgHtml } from '@/gui/mappings';
import { transitionDurationMsKey } from '@/gui/plugins/provides/index.ts';

const transitionDurationMs = inject(transitionDurationMsKey);
const { letter, isInverted, isHighlighted, isElevated } = defineProps({
  letter: { type: String, required: true },
  isInverted: { type: Boolean, default: false },
  isHighlighted: { type: Boolean, default: false },
  isElevated: { type: Boolean, default: false },
});
const transitionIsDisabled = ref(false);

watch(
  () => letter,
  newValue => {
    if (newValue) transitionIsDisabled.value = true; // TODO test
    setTimeout(() => {
      transitionIsDisabled.value = false;
    }, transitionDurationMs);
  },
);
</script>

<template>
  <svg
    :class="{
      tile: true,
      'tile--inverted': isInverted,
      'tile--highlighted': isHighlighted,
      'tile--elevated': isElevated,
      'tile--transition-is-disabled': transitionIsDisabled,
    }"
    viewBox="0 0 21 21"
    v-html="getLetterSvgHtml(letter)"
  ></svg>
</template>

<style lang="scss">
.tile {
  cursor: pointer;
  fill: currentColor;
  aspect-ratio: 1 / 1;
  color: var(--tile-color);
  background: var(--tile-bg);
  border-radius: inherit;
  transition-property: top, left, background, color, box-shadow;
  transition-duration: var(--transition-duration);
  transition-timing-function: var(--transition-timing-function);
  position: relative;
  top: 0;
  left: 0;
  &--transition-is-disabled {
    transition-duration: 0ms;
  }
  &--inverted:not(&--highlighted) {
    background: var(--tile-bg-inverted);
    color: var(--tile-color-inverted);
  }
  &--highlighted:not(&--elevated) {
    background: var(--tile-bg-highlighted);
  }
  &--elevated {
    box-shadow: calc(var(--tile-shadow-inset-elevated) * -1) var(--tile-shadow-inset-elevated) var(--tile-shadow-color);
    top: calc(var(--tile-shadow-inset-elevated) * -1) !important;
    left: var(--tile-shadow-inset-elevated) !important;
  }
  &--elevated:is(&--inverted) {
    box-shadow: calc(var(--tile-shadow-inset-elevated) * -1) var(--tile-shadow-inset-elevated)
      var(--tile-shadow-color-inverted);
  }
}
</style>
