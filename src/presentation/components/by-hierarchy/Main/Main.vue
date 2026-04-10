<script lang="ts" setup>
import MainAnnotation from '@/presentation/components/by-hierarchy/Main/MainAnnotation/MainAnnotation.vue';
import MainBoard from '@/presentation/components/by-hierarchy/Main/MainBoard/MainBoard.vue';
import MainFooter from '@/presentation/components/by-hierarchy/Main/MainFooter/MainFooter.vue';
import MainHeader from '@/presentation/components/by-hierarchy/Main/MainHeader/MainHeader.vue';
import RackStore from '@/presentation/stores/RackStore.ts';
const rackStore = RackStore.INSTANCE();
</script>

<template>
  <main class="main" @click="rackStore.deselectTile()">
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
}
</style>
