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
    <li v-for="(tile, idx) in tiles" :key="idx" class="grid__cell" @click.stop="rackStore.handleClickFooterCell(idx)">
      <AppTile
        v-if="rackStore.isTileVisible(tile)"
        :letter="matchStore.getTileLetter(tile)"
        :is-inverted="rackStore.isTileSelected(tile)"
        @click.stop="rackStore.handleClickFooterTile(tile)"
      />
    </li>
    <li class="grid__count">
      <p>
        <span v-animate-number="{ number: tilesRemaining }" class="grid__count-item" />
        {{ t('game.unassigned_count') }}
      </p>
    </li>
  </ul>
</template>

<style lang="scss" scoped>
.grid {
  &__cell {
    cursor: pointer;
    background: var(--cell-bg-footer);
    border-radius: calc(var(--primary-border-radius) * 2);
    box-shadow: var(--cell-shadow-footer);
  }
  &__count {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--secondary-color);
    font-size: var(--font-size-small);
  }
  &__count-item {
    width: max-content;
    height: max-content;
    position: static;
  }
}
</style>
