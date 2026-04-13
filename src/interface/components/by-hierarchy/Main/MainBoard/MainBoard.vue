<script lang="ts" setup>
import MainBoardCell from '@/interface/components/by-hierarchy/Main/MainBoard/MainBoardCell.vue';
import MainBoardOutline from '@/interface/components/by-hierarchy/Main/MainBoard/MainBoardOutline.vue';
import ApplicationStore from '@/interface/stores/ApplicationStore.ts';
const applicationStore = ApplicationStore.INSTANCE();
</script>

<template>
  <ul
    :class="{
      'app__create-grid': true,
      'app__create-grid--for-board': true,
      'app__limit-max-width': true,
      grid: true,
    }"
  >
    <MainBoardCell v-for="cell in applicationStore.boardCells" :key="cell" :cell="cell" />
    <MainBoardOutline />
  </ul>
</template>
