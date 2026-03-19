<script lang="ts" setup>
import { getLetterSvgHtml } from "@/gui/mappings.ts";
defineProps({
  letter: { type: String, required: true },
  isInverted: { type: Boolean, default: false },
  isHighlighted: { type: Boolean, default: false },
  isElevated: { type: Boolean, default: false },
});
</script>

<template>
  <svg
    :class="{
      tile: true,
      'tile--inverted': isInverted,
      'tile--highlighted': isHighlighted,
      'tile--elevated': isElevated,
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
  transition-property: top, left, background, color, box-shadow, outline;
  transition-duration: var(--transition-duration-half);
  transition-timing-function: var(--transition-timing-function);
  position: relative;
  top: 0;
  left: 0;
  z-index: 1;
  min-height: 100%;
  &--inverted:not(&--highlighted) {
    background: var(--tile-bg-inverted);
    color: var(--tile-color-inverted);
  }
  &--highlighted:not(&--elevated) {
    background: var(--tile-bg-highlighted);
  }
  &--elevated {
    outline: 2px solid var(--tile-outline-color);
  }
}
</style>
