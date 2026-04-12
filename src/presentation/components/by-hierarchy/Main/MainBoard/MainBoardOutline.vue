<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import MainBoardTooltip from '@/presentation/components/by-hierarchy/Main/MainBoard/MainBoardTooltip.vue';
import UseTileLocator from '@/presentation/composables/UseTileLocator.ts';
import InventoryStore from '@/presentation/stores/InventoryStore.ts';
const inventoryStore = InventoryStore.INSTANCE();
const tileLocator = new UseTileLocator();
const { tiles } = storeToRefs(inventoryStore);
const locations = computed(() => tileLocator.getLocationsFor(tiles.value));
const CELL_STEP = 'calc((100% + var(--cell-tile-gap)) / var(--cell-count-per-axis))'; // TODO move to css variable
</script>

<template>
  <div
    v-for="(group, idx) in locations"
    :key="idx"
    class="outline"
    :style="{
      top: `calc(${CELL_STEP} * ${group.row})`,
      left: `calc(${CELL_STEP} * ${group.col})`,
      width: `calc(${CELL_STEP} * ${group.colSpan} - var(--cell-tile-gap) - 1px)`,
      height: `calc(${CELL_STEP} * ${group.rowSpan} - var(--cell-tile-gap) - 1px)`,
    }"
  >
    <Transition name="fade" appear>
      <MainBoardTooltip
        v-if="tileLocator.areLocationsForSelectedTiles(locations, idx)"
        :is-flipped="tileLocator.isLocationOnRightmostColumn(locations, idx)"
      />
    </Transition>
  </div>
</template>

<style lang="scss" scoped>
.outline {
  position: absolute;
  z-index: var(--z-index-level-1);
  outline: 2px solid var(--tile-outline-color);
  border-radius: var(--cell-tile-border-radius);
  transition-property: top, left, width, height, outline;
  transition-duration: var(--transition-duration-half);
  transition-timing-function: var(--transition-timing-function);
  pointer-events: none;
}
</style>
