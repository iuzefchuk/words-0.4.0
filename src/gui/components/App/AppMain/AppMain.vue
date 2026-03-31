<script lang="ts" setup>
import AppMainAnnotation from '@/gui/components/App/AppMain/AppMainAnnotation.vue';
import AppMainBoard from '@/gui/components/App/AppMain/AppMainBoard/AppMainBoard.vue';
import AppMainFooter from '@/gui/components/App/AppMain/AppMainFooter/AppMainFooter.vue';
import AppMainHeader from '@/gui/components/App/AppMain/AppMainHeader/AppMainHeader.vue';
import RackStore from '@/gui/stores/RackStore.ts';
const rackStore = RackStore.INSTANCE();
</script>

<template>
  <main class="main" @click="rackStore.deselectTile()">
    <Transition name="fade-down-up" appear>
      <AppMainHeader />
    </Transition>
    <div class="main__center app__width-content">
      <AppMainAnnotation class="main__center-annotation" />
      <AppMainBoard />
    </div>
    <Transition name="fade-up-down" appear>
      <AppMainFooter />
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
