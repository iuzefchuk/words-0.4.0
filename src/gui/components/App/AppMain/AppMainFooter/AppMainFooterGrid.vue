<script lang="ts" setup>
import AppTile from '@/gui/components/shared/AppTile.vue';
import GameStore from '@/gui/stores/GameStore.ts';
import ItemsStore from '@/gui/stores/ItemsStore.ts';
import { storeToRefs } from 'pinia';
const storeGame = GameStore.getInstance();
const storeItems = ItemsStore.getInstance();
const { tilesRemaining } = storeToRefs(storeGame);
const { tiles } = storeToRefs(storeItems);
</script>

<template>
  <ul class="app__width-content app__grid--footer">
    <li v-for="(tile, idx) in tiles" :key="idx" class="inventory__cell" @click="storeItems.handleClickRackCell(idx)">
      <AppTile
        v-if="storeItems.isTileVisible(tile)"
        :letter="storeGame.getTileLetter(tile)"
        :is-inverted="storeItems.isTileSelected(tile)"
        @click.stop="storeItems.handleClickRackTile(tile)"
      />
    </li>
    <li class="inventory__count">
      <p>
        <span v-animate-number="{ number: tilesRemaining }" class="inventory__count-item" />
        {{ t('game.unassigned_count') }}
      </p>
    </li>
  </ul>
</template>

<style lang="scss" scoped>
.inventory {
  &__cell {
    cursor: pointer;
    background: var(--color-gray-faint);
    border-radius: calc(var(--primary-border-radius) * 2);
    box-shadow: var(--box-shadow-inner);
  }
  &__count {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-weight: var(--font-weight);
  }
  &__count-item {
    width: max-content;
    height: max-content;
    position: static;
  }
}
</style>
