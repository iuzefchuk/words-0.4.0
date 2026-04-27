<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import MainPlayfieldTooltip from '@/interface/components/by-hierarchy/Main/MainPlayfield/MainPlayfieldTooltip.vue';
import UseOutline from '@/interface/composables/UseOutline.ts';
import UserStore from '@/interface/stores/UserStore.ts';
const userStore = UserStore.INSTANCE();
const tileLocator = new UseOutline();
const { tiles } = storeToRefs(userStore);
const locations = computed(() => tileLocator.getLocationsFor(tiles.value));
</script>

<template>
  <div
    v-for="(group, idx) in locations"
    :key="idx"
    class="outline"
    :style="{
      '--outline-cell-step': `calc((100% + var(--grid-gap)) / var(--grid-items-per-axis))`,
      top: `calc(var(--outline-cell-step) * ${group.row})`,
      left: `calc(var(--outline-cell-step) * ${group.col})`,
      width: `calc(var(--outline-cell-step) * ${group.colSpan} - var(--grid-gap) - 1px)`,
      height: `calc(var(--outline-cell-step) * ${group.rowSpan} - var(--grid-gap) - 1px)`,
    }"
  >
    <Transition name="fade" appear>
      <MainPlayfieldTooltip
        v-if="tileLocator.areLocationsForSelectedTiles(locations, idx)"
        :is-flipped="tileLocator.isLocationOnRightmostColumn(locations, idx)"
      />
    </Transition>
  </div>
</template>

<style lang="scss" scoped>
.outline {
  z-index: var(--z-index-level-1);
  pointer-events: none;
  position: absolute;
  outline: var(--tile-outline);
  border-radius: var(--grid-item-radius);
  transition-property: top, left, width, height, outline;
  transition-duration: var(--transition-duration-half);
  transition-timing-function: var(--transition-timing-function);
}
</style>
