<script lang="ts" setup>
import { useStoreGame } from '@/gui/stores/game.ts';
import { useStoreInventory } from '@/gui/stores/inventory.ts';
import { storeToRefs } from 'pinia';

const storeGame = useStoreGame();
const storeInventory = useStoreInventory();
const { tilesRemaining } = storeToRefs(storeGame);
const { inventoryList } = storeToRefs(storeInventory);
</script>

<template>
  <ul class="game__width-content game__grid--footer">
    <li class="inventory__count">
      <span v-animate-number="{ number: tilesRemaining }" class="inventory__count-item" />
      <span class="inventory__count-item">{{ t('game.unassigned_count') }}</span>
    </li>
    <li
      v-for="(tile, idx) in inventoryList"
      :key="idx"
      class="inventory__cell"
      @click="storeInventory.handleClickRackCell(idx)"
    >
      <TileId
        v-if="storeInventory.isTileVisible(tile)"
        :tile="tile"
        :is-inverted="storeInventory.isTileSelected(tile)"
        @click.stop="storeInventory.handleClickRackTile(tile)"
      />
    </li>
  </ul>
</template>

<style lang="scss" scoped>
.inventory {
  &__count {
    font-size: var(--font-size-small);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--color-gray-dark);
  }
  &__count-item {
    width: max-content;
    height: max-content;
    position: static;
  }
  &__cell {
    cursor: pointer;
    background: var(--color-gray-faint);
    border-radius: calc(var(--primary-border-radius) * 2);
    box-shadow: var(--box-shadow-inner);
  }
}
</style>
