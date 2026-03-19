<script lang="ts" setup>
import AppTile from '@/gui/components/shared/AppTile.vue';
import MatchStore from '@/gui/stores/MatchStore.ts';
import RackStore from '@/gui/stores/RackStore.ts';
import { storeToRefs } from 'pinia';
const matchStore = MatchStore.INSTANCE();
const rackStore = RackStore.INSTANCE();
const { tilesRemaining } = storeToRefs(matchStore);
const { tiles } = storeToRefs(rackStore);
</script>

<template>
  <ul class="app__width-content app__grid--footer">
    <li
      v-for="(tile, idx) in tiles"
      :key="idx"
      class="inventory__cell"
      @click.stop="rackStore.handleClickRackCell(idx)"
    >
      <AppTile
        v-if="rackStore.isTileVisible(tile)"
        :letter="matchStore.getTileLetter(tile)"
        :is-inverted="rackStore.isTileSelected(tile)"
        @click.stop="rackStore.handleClickRackTile(tile)"
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
    color: var(--color-gray-light);
    font-size: var(--font-size-small);
  }
  &__count-item {
    width: max-content;
    height: max-content;
    position: static;
  }
}
</style>
