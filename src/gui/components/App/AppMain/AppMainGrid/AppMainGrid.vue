<script lang="ts" setup>
import AppMainGridCell from '@/gui/components/App/AppMain/AppMainGrid/AppMainGridCell.vue';
import AppMainGridTooltip from '@/gui/components/App/AppMain/AppMainGrid/AppMainGridTooltip.vue';
import MatchStore from '@/gui/stores/MatchStore.ts';
const matchStore = MatchStore.getInstance();
</script>

<template>
  <ul
    :class="{
      app__grid: true,
      'app__grid--board': true,
      'app__width-content': true,
      grid: true,
    }"
  >
    <AppMainGridCell v-for="cell in matchStore.layoutCells" :key="cell" :cell="cell">
      <Transition name="fade" appear>
        <AppMainGridTooltip v-if="matchStore.isCellLastConnectionInTurn(cell)" />
      </Transition>
    </AppMainGridCell>
  </ul>
</template>

<style lang="scss" scoped>
.grid {
  aspect-ratio: 1 / 1;
  justify-self: center;
  align-self: center;
}
</style>
