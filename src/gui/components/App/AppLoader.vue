<script lang="ts" setup>
import AppTile from '@/gui/components/shared/AppTile.vue';
import LoaderController from '@/gui/controllers/LoaderController.ts';
const props = defineProps({ isActive: { type: Boolean, required: true } });
const emit = defineEmits(['derendered']);
const controller = new LoaderController(props, emit);
const { isRendered, INTRO_LETTERS, allTilesAreHighlighted } = controller;
const isTileElevated = controller.isTileElevated.bind(controller);
</script>

<template>
  <Transition name="fade">
    <div v-if="isRendered" class="loader">
      <div class="loader__logo">
        <AppTile
          v-for="(letter, idx) in INTRO_LETTERS"
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
