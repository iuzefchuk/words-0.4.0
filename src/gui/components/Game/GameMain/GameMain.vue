<script lang="ts" setup>
import GameMainHeader from '@/gui/components/Game/GameMain/GameMainHeader.vue';
import GameMainBoard from '@/gui/components/Game/GameMain/GameMainBoard/GameMainBoard.vue';
import GameMainFooter from '@/gui/components/Game/GameMain/GameMainFooter/GameMainFooter.vue';
import { ref } from 'vue';

const isBlurred = ref(false);
</script>

<template>
  <main :class="{ main: true, 'main--blurred': isBlurred }">
    <Transition name="fade-down-up" appear>
      <GameMainHeader />
    </Transition>
    <GameMainBoard />
    <Transition name="fade-up-down" appear>
      <GameMainFooter />
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
