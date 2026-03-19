<script lang="ts" setup>
import RackStore from '@/gui/stores/RackStore.ts';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
const rackStore = RackStore.INSTANCE();
const { placedTilesCoords: coords } = storeToRefs(rackStore);
const cellStep = 'calc((100% + var(--cell-tile-gap)) / var(--cell-count-per-axis))';
const style = computed(() => {
  const { rows, columns } = coords.value;
  if (!rows.length || !columns.length) return {};
  const firstRow = rows[0];
  const firstCol = columns[0];
  const rowSpan = rows[rows.length - 1] - firstRow + 1;
  const colSpan = columns[columns.length - 1] - firstCol + 1;
  return {
    top: `calc(${cellStep} * ${firstRow})`,
    left: `calc(${cellStep} * ${firstCol})`,
    width: `calc(${cellStep} * ${colSpan} - var(--cell-tile-gap) - 1px)`,
    height: `calc(${cellStep} * ${rowSpan} - var(--cell-tile-gap) - 1px)`,
  };
});
</script>

<template>
  <div v-if="rackStore.anyTileIsPlaced" class="outline" :style="style" />
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
