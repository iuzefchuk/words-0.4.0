<script lang="ts" setup>
import AppMainHeader from '@/gui/components/App/AppMain/AppMainHeader.vue';
import AppMainGrid from '@/gui/components/App/AppMain/AppMainGrid/AppMainGrid.vue';
import AppMainFooter from '@/gui/components/App/AppMain/AppMainFooter/AppMainFooter.vue';
import { ref } from 'vue';
const isBlurred = ref(false);
</script>

<template>
  <main :class="{ main: true, 'main--blurred': isBlurred }">
    <Transition name="fade-down-up" appear>
      <AppMainHeader />
    </Transition>
    <AppMainGrid />
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
  &--blurred {
    filter: blur(0.2rem);
    opacity: 0.9;
  }
}
</style>
