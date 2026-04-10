<script lang="ts" setup>
import AppTile from '@/presentation/components/shared/AppTile/AppTile.vue';
import UseLoader from './UseLoader.ts';
const props = defineProps<{
  isActive: boolean;
}>();
const emit = defineEmits<{ derendered: void }>();
const loader = UseLoader.create(props, emit);
const { isRendered } = loader;
</script>

<template>
  <Transition name="fade">
    <div v-if="isRendered" class="loader">
      <div class="loader__logo">
        <template v-for="(letter, idx) in UseLoader.LETTERS" :key="idx">
          <AppTile v-if="loader.isItemRendered(idx)" class="loader__tile" :letter="letter" :is-saturated="loader.isItemEmphasized()" />
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
