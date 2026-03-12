<script lang="ts" setup>
import GameMainBoardCell from '@/gui/components/Game/GameMain/GameMainBoard/GameMainBoardCell.vue';
import GameMainBoardTooltip from '@/gui/components/Game/GameMain/GameMainBoard/GameMainBoardTooltip.vue';
import GameStore from '@/gui/stores/GameStore.ts';
const storeGame = GameStore.getInstance();
</script>

<template>
  <ul
    :class="{
      game__grid: true,
      'game__grid--board': true,
      'game__width-content': true,
      board: true,
    }"
  >
    <GameMainBoardCell v-for="cell in storeGame.layoutCells" :key="cell" :cell="cell">
      <Transition name="fade" appear>
        <GameMainBoardTooltip v-if="storeGame.isCellLastConnectionInTurn(cell)" />
      </Transition>
    </GameMainBoardCell>
  </ul>
</template>

<style lang="scss" scoped>
.board {
  aspect-ratio: 1 / 1;
  justify-self: center;
  align-self: center;
}
</style>
