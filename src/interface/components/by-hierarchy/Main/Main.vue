<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import { computed, inject, nextTick, onMounted, ref } from 'vue';
import MainAnnotation from '@/interface/components/by-hierarchy/Main/MainAnnotation.vue';
import MainBoard from '@/interface/components/by-hierarchy/Main/MainBoard/MainBoard.vue';
import MainEndscreen from '@/interface/components/by-hierarchy/Main/MainEndscreen.vue';
import MainFooter from '@/interface/components/by-hierarchy/Main/MainFooter/MainFooter.vue';
import MainHeader from '@/interface/components/by-hierarchy/Main/MainHeader.vue';
import ProvidesPlugin from '@/interface/plugins/ProvidesPlugin.ts';
import InventoryStore from '@/interface/stores/InventoryStore.ts';
import MainStore from '@/interface/stores/MainStore.ts';
await MainStore.initiate();
const mainStore = MainStore.INSTANCE();
const { matchIsFinished } = storeToRefs(mainStore);
const inventoryStore = InventoryStore.INSTANCE();
const transitionDurationMs = inject(ProvidesPlugin.TRANSITION_DURATION_MS_KEY);
const isMounted = ref(false);
onMounted(() => nextTick(() => (isMounted.value = true)));
const style = computed(() => ({
  ...(transitionDurationMs !== undefined && {
    '--transition-duration': `${String(transitionDurationMs)}ms`,
    '--transition-duration-half': `${String(transitionDurationMs / 2)}ms`,
  }),
  '--cell-count-per-axis': 15, // TODO remove when implementing dynamic board sizes
}));
</script>

<template>
  <main :style="style" :class="{ main: true, 'main--blurred': matchIsFinished }" @click="inventoryStore.deselectTile()">
    <Transition name="fade-down-up">
      <MainHeader v-if="isMounted" />
    </Transition>
    <div class="main__center app__limit-max-width">
      <MainAnnotation class="main__center-annotation" />
      <MainBoard />
    </div>
    <Transition name="fade-up-down">
      <MainFooter v-if="isMounted" />
    </Transition>
  </main>
  <Transition name="fade">
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
