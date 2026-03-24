<script lang="ts" setup>
import DomainTile from '@/gui/components/shared/AppTile.vue';
import UseLoader from '@/gui/composables/UseLoader.ts';
const props = defineProps({ isActive: { type: Boolean, required: true } });
const emit = defineEmits(['derendered']);
const loader = new UseLoader(props, emit);
const { isRendered, allTilesAreSaturated } = loader;
</script>

<template>
  <Transition name="fade">
    <div v-if="isRendered" class="loader">
      <div class="loader__logo">
        <template v-for="(letter, idx) in UseLoader.WORD" :key="idx">
          <DomainTile
            v-if="loader.isTileOutlined(idx) || allTilesAreSaturated"
            class="loader__tile"
            :letter="letter"
            :is-saturated="allTilesAreSaturated"
          />
        </template>
      </div>
    </div>
  </Transition>
</template>

<style lang="scss" scoped>
.loader {
  position: fixed;
  background: var(--primary-bg);
  width: 100vw;
  height: 100vh;
  z-index: var(--z-index-level-3);
  display: grid;
  place-content: center;
  &__logo {
    display: flex;
    flex-direction: row;
    gap: calc(var(--cell-tile-gap) * 1.25);
  }
  &__tile {
    pointer-events: none;
    width: var(--cell-tile-width);
    border-radius: var(--primary-border-radius);
  }
}
</style>
