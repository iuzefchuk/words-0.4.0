<script lang="ts" setup>
import RackStore from '@/gui/stores/RackStore.ts';
import type { OutlineGroup } from '@/gui/composables/UseOutline.ts';
const rackStore = RackStore.INSTANCE();
const cellStep = 'calc((100% + var(--cell-tile-gap)) / var(--cell-count-per-axis))';

function toStyle(group: OutlineGroup) {
  return {
    top: `calc(${cellStep} * ${group.row})`,
    left: `calc(${cellStep} * ${group.col})`,
    width: `calc(${cellStep} * ${group.colSpan} - var(--cell-tile-gap) - 1px)`,
    height: `calc(${cellStep} * ${group.rowSpan} - var(--cell-tile-gap) - 1px)`,
  };
}
</script>

<template>
  <div v-for="(group, i) in rackStore.outlineGroups" :key="i" class="outline" :style="toStyle(group)" />
</template>

<style lang="scss" scoped>
.outline {
  position: absolute;
  z-index: var(--z-index-level-1);
  outline: 2px solid var(--tile-outline-color);
  border-radius: var(--primary-border-radius);
  transition-property: top, left, width, height, outline;
  transition-duration: var(--transition-duration-half);
  transition-timing-function: var(--transition-timing-function);
  pointer-events: none;
}
</style>
