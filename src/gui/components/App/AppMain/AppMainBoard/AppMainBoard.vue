<script lang="ts" setup>
import AppMainBoardCell from '@/gui/components/App/AppMain/AppMainBoard/AppMainBoardCell.vue';
import AppMainBoardOutline from '@/gui/components/App/AppMain/AppMainBoard/AppMainBoardOutline.vue';
import AppMainBoardTooltip from '@/gui/components/App/AppMain/AppMainBoard/AppMainBoardTooltip.vue';
import MatchStore from '@/gui/stores/MatchStore.ts';
const matchStore = MatchStore.INSTANCE();
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
    <AppMainBoardCell v-for="cell in matchStore.boardCells" :key="cell" :cell="cell">
      <Transition name="fade" appear>
        <AppMainBoardTooltip v-if="cell === matchStore.currentTurnTopRightCell" />
      </Transition>
    </AppMainBoardCell>
    <AppMainBoardOutline />
  </ul>
</template>

<style lang="scss" scoped>
.grid {
  aspect-ratio: 1 / 1;
}
</style>
