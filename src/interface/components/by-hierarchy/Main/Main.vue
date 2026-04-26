<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import { nextTick, onMounted, ref } from 'vue';
import MainEventsHistory from '@/interface/components/by-hierarchy/Main/MainEventsHistory.vue';
import MainBoard from '@/interface/components/by-hierarchy/Main/MainBoard/MainBoard.vue';
import MainNotification from '@/interface/components/by-hierarchy/Main/MainNotification.vue';
import MainEndscreen from '@/interface/components/by-hierarchy/Main/MainEndscreen.vue';
import MainMenu from '@/interface/components/by-hierarchy/Main/MainMenu.vue';
import MainStatistics from '@/interface/components/by-hierarchy/Main/MainStatistics.vue';
import MainInventory from '@/interface/components/by-hierarchy/Main/MainInventory.vue';
import MainStore from '@/interface/stores/MainStore.ts';
import UserStore from '@/interface/stores/UserStore.ts';
await MainStore.initiate();
const mainStore = MainStore.INSTANCE();
const { matchIsFinished } = storeToRefs(mainStore);
const userStore = UserStore.INSTANCE();
const isMounted = ref(false);
onMounted(() => nextTick(() => (isMounted.value = true)));
</script>

<template>
  <MainNotification />
  <main
    :style="{ '--grid-items-per-axis': mainStore.boardCellsPerAxis }"
    :class="{ main: true, 'main--blurred': matchIsFinished }"
    @click="userStore.deselectTile()"
  >
    <div class="main__top">
      <Transition name="fade-down-up">
        <MainStatistics v-if="isMounted" />
      </Transition>
    </div>
    <div class="main__mid app__limit-max-width">
      <MainEventsHistory class="main__mid-events-history" />
      <MainBoard />
    </div>
    <div class="main__bottom">
      <Transition name="fade-up-down">
        <MainInventory class="main__bottom-inventory app__limit-max-width" v-if="isMounted" />
      </Transition>
      <Transition name="fade-up-down">
        <!-- TODO change direction -->
        <MainMenu class="main__bottom-menu" v-if="isMounted" />
      </Transition>
    </div>
  </main>
  <Transition name="fade">
    <MainEndscreen v-if="matchIsFinished" />
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
  &__top {
    align-self: flex-start;
    justify-self: flex-start;
  }
  &__mid {
    position: relative;
  }
  &__mid-events-history {
    position: absolute;
    top: -7rem;
  }
  &__bottom {
    justify-self: center;
    align-self: end;
    padding: var(--primary-padding) 0;
    width: 100%;
    display: grid;
    grid-template-columns: 1px 2fr 1px;
    grid-template-rows: auto;
    align-items: center;
  }
  &__bottom-inventory {
    grid-column: 2;
    align-self: flex-start;
    justify-self: center;
  }
  &__bottom-menu {
    grid-column: 3;
    justify-self: end;
  }
  &--blurred {
    filter: blur(0.5rem);
    opacity: var(--opacity-disabled);
  }
}
</style>
