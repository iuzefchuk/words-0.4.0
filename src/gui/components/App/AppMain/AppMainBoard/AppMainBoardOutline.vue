<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import UseOutline from '@/gui/composables/UseOutline.ts';
import RackStore from '@/gui/stores/RackStore.ts';
const outline = new UseOutline();
const rackStore = RackStore.INSTANCE();
const { tiles } = storeToRefs(rackStore);
const outlineGroups = computed(() => outline.createGroups(tiles.value));
const CELL_STEP = 'calc((100% + var(--cell-tile-gap)) / var(--cell-count-per-axis))';
</script>

<template>
  <div
    v-for="(group, idx) in outlineGroups"
    :key="idx"
    class="outline"
    :style="{
      top: `calc(${CELL_STEP} * ${group.row})`,
      left: `calc(${CELL_STEP} * ${group.col})`,
      width: `calc(${CELL_STEP} * ${group.colSpan} - var(--cell-tile-gap) - 1px)`,
      height: `calc(${CELL_STEP} * ${group.rowSpan} - var(--cell-tile-gap) - 1px)`,
    }"
  />
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
