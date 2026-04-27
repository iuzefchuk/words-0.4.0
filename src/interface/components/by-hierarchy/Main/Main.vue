<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import { nextTick, onMounted, ref } from 'vue';
import MainActions from '@/interface/components/by-hierarchy/Main/MainActions.vue';
import MainEndscreen from '@/interface/components/by-hierarchy/Main/MainEndscreen.vue';
import MainError from '@/interface/components/by-hierarchy/Main/MainError.vue';
import MainFeed from '@/interface/components/by-hierarchy/Main/MainFeed.vue';
import MainPlayfield from '@/interface/components/by-hierarchy/Main/MainPlayfield/MainPlayfield.vue';
import MainRack from '@/interface/components/by-hierarchy/Main/MainRack.vue';
import MainScoreline from '@/interface/components/by-hierarchy/Main/MainScoreline.vue';
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
  <main
    v-if="isMounted"
    :style="{ '--grid-items-per-axis': mainStore.boardCellsPerAxis }"
    :class="{ main: true, 'main--blurred': matchIsFinished }"
    @click="userStore.deselectTile()"
  >
    <header class="main__top">
      <Transition name="fade-down-up" appear>
        <MainError />
      </Transition>
      <Transition name="fade-down-up" appear>
        <MainScoreline />
      </Transition>
    </header>
    <div class="main__mid app__limit-max-width">
      <MainFeed class="main__mid-history" />
      <MainPlayfield />
    </div>
    <footer class="main__bottom">
      <Transition name="fade-up-down" appear>
        <MainRack class="main__bottom-rack app__limit-max-width" />
      </Transition>
      <Transition name="fade-from-left" appear>
        <MainActions class="main__bottom-actions" />
      </Transition>
    </footer>
  </main>
  <Transition name="fade" appear>
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
  &__mid-history {
    position: absolute;
    top: -7rem;
    right: 0rem;
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
    overflow-x: hidden;
  }
  &__bottom-rack {
    grid-column: 2;
    align-self: flex-start;
    justify-self: center;
    margin-top: var(--space-m);
  }
  &__bottom-actions {
    grid-column: 3;
    justify-self: end;
  }
  &--blurred {
    filter: blur(0.5rem);
    opacity: var(--opacity-disabled);
  }
}
</style>
