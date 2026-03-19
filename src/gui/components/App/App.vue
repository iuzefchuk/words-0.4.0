<script lang="ts" setup>
import AppMain from '@/gui/components/App/AppMain/AppMain.vue';
import AppDialog from '@/gui/components/App/AppDialog.vue';
import AppEndscreen from '@/gui/components/App/AppEndscreen.vue';
import AppLoader from '@/gui/components/App/AppLoader.vue';
import { onMounted, ref, inject } from 'vue';
import MatchStore from '@/gui/stores/MatchStore.ts';
import { storeToRefs } from 'pinia';
import ProvidesPlugin from '@/gui/plugins/ProvidesPlugin.ts';
const matchStore = MatchStore.INSTANCE();
const { matchIsFinished } = storeToRefs(matchStore);
const loaderIsActive = ref(true);
const mainIsRendered = ref(false);
const transitionDurationMs = inject(ProvidesPlugin.TRANSITION_DURATION_MS_KEY);

onMounted(() => {
  loaderIsActive.value = false;
});
</script>

<template>
  <div
    :class="{ app: true, 'app--blurred': matchIsFinished }"
    :style="{
      ...(transitionDurationMs && {
        '--transition-duration': `${transitionDurationMs}ms`,
        '--transition-duration-half': `${transitionDurationMs / 2}ms`,
      }),
      '--cell-count-per-axis': Math.sqrt(matchStore.layoutCells.length),
    }"
  >
    <AppLoader :is-active="loaderIsActive" @derendered="mainIsRendered = true" />
    <AppMain v-if="mainIsRendered" />
    <AppDialog />
  </div>
  <AppEndscreen v-if="matchIsFinished" />
</template>

<style lang="scss">
@use '@/gui/assets/css/adjustments.scss';
@use '@/gui/assets/css/animations.scss';
@use '@/gui/assets/css/app.scss';
@use '@/gui/assets/css/colors.scss';
@use '@/gui/assets/css/transitions.scss';
@use '@/gui/assets/css/variables.scss';
</style>
