<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import { computed, inject } from 'vue';
import MainAnnotation from '@/presentation/components/by-hierarchy/Main/MainAnnotation.vue';
import MainBoard from '@/presentation/components/by-hierarchy/Main/MainBoard/MainBoard.vue';
import MainEndscreen from '@/presentation/components/by-hierarchy/Main/MainEndscreen.vue';
import MainFooter from '@/presentation/components/by-hierarchy/Main/MainFooter/MainFooter.vue';
import MainHeader from '@/presentation/components/by-hierarchy/Main/MainHeader.vue';
import ProvidesPlugin from '@/presentation/plugins/ProvidesPlugin.ts';
import InventoryStore from '@/presentation/stores/InventoryStore.ts';
import MainStore from '@/presentation/stores/MainStore.ts';
await MainStore.initiate();
const { matchIsFinished } = storeToRefs(MainStore.INSTANCE());
const inventoryStore = InventoryStore.INSTANCE();
const transitionDurationMs = inject(ProvidesPlugin.TRANSITION_DURATION_MS_KEY);
const style = computed(() => ({
  ...(transitionDurationMs && {
    '--transition-duration': `${transitionDurationMs}ms`,
    '--transition-duration-half': `${transitionDurationMs / 2}ms`,
  }),
  '--cell-count-per-axis': 15, // TODO delete
}));
</script>

<template>
  <main :style="style" :class="{ main: true, 'main--blurred': matchIsFinished }" @click="inventoryStore.deselectTile()">
    <Transition name="fade-down-up" appear>
      <MainHeader />
    </Transition>
    <div class="main__center app__limit-max-width">
      <MainAnnotation class="main__center-annotation" />
      <MainBoard />
    </div>
    <Transition name="fade-up-down" appear>
      <MainFooter />
    </Transition>
  </main>
  <Transition name="fade" appear>
    <MainEndscreen v-if="matchIsFinished" :style="style" />
  </Transition>
</template>

<style lang="scss" scoped>
.main {
  transition-property: filter, opacity;
  transition-duration: var(--transition-duration);
  transition-timing-function: var(--transition-timing-function);
  width: 100%;
  min-height: 100vh;
  height: 100vh;
  max-height: 100vh;
  gap: var(--space-s);
  display: grid;
  grid-template-rows: 1fr auto 1fr;
  align-items: center;
  padding-left: var(--primary-padding);
  padding-right: var(--primary-padding);
  justify-items: center;
  &__center {
    position: relative;
  }
  &__center-annotation {
    position: absolute;
    top: -7rem;
  }
  &--blurred {
    filter: blur(0.5rem);
    opacity: var(--opacity-disabled);
  }
}
</style>
