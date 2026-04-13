<script lang="ts" setup>
import { computed } from 'vue';
import { GameBonus, GameCell } from '@/application/types/index.ts';
import GameTile from '@/interface/components/shared/AppTile/AppTile.vue';
import UseEventHandlers from '@/interface/composables/UseEventHandlers.ts';
import { getBonusName } from '@/interface/mappings.ts';
import ApplicationStore from '@/interface/stores/ApplicationStore.ts';
import InventoryStore from '@/interface/stores/InventoryStore.ts';
const events = UseEventHandlers.create();
const props = defineProps<{
  cell: GameCell;
}>();
const applicationStore = ApplicationStore.INSTANCE();
const inventoryStore = InventoryStore.INSTANCE();
const isCellCenter = computed(() => applicationStore.isCellCenter(props.cell));
const bonus = computed(() => applicationStore.getCellBonus(props.cell));
const bonusName = computed(() => (bonus.value ? getBonusName(bonus.value) : ''));
const tile = computed(() => applicationStore.findTileOnCell(props.cell));
const isTileSaturated = computed(() => tile.value != null && applicationStore.wasTileUsedInPreviousTurn(tile.value));
</script>

<template>
  <li
    :class="{
      cell: true,
      'cell--center': isCellCenter,
      'cell--has-tile': tile,
    }"
    @click.stop="events.handleClickBoardCell(cell)"
  >
    <Transition name="fade" appear>
      <svg
        v-if="bonus"
        :class="{
          cell__bonus: true,
          'cell__bonus--dw': bonus === GameBonus.DoubleWord,
          'cell__bonus--tw': bonus === GameBonus.TripleWord,
          'cell__bonus--dl': bonus === GameBonus.DoubleLetter,
          'cell__bonus--tl': bonus === GameBonus.TripleLetter,
        }"
        class="cell__bonus"
        viewBox="0 0 40 40"
      >
        <text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle">
          {{ bonusName }}
        </text>
      </svg>
    </Transition>
    <Transition name="fade" appear>
      <GameTile
        v-if="tile"
        :letter="applicationStore.getTileLetter(tile)"
        :is-inverted="inventoryStore.isTileSelected(tile)"
        :is-saturated="isTileSaturated"
        @click.stop="events.handleClickBoardTile(tile)"
        @dblclick.stop="events.handleDoubleClickBoardTile(tile)"
      />
    </Transition>
  </li>
</template>

<style lang="scss" scoped>
.cell {
  max-width: var(--cell-tile-width);
  border-radius: var(--cell-tile-border-radius);
  background: var(--cell-bg);
  user-select: none;
  box-shadow: var(--cell-shadow);
  cursor: pointer;
  &--center {
    background: var(--cell-bg-center);
  }
  &--center,
  &--has-tile {
    box-shadow: none;
  }
  &__bonus {
    font-weight: var(--font-weight-bigger);
    z-index: var(--z-index-level-1);
    $bonuses: 'dw', 'tw', 'dl', 'tl';
    @each $bonus in $bonuses {
      &--#{$bonus} text {
        fill: var(--cell-color-#{$bonus});
      }
    }
  }
  &__tile {
    width: 100%;
    max-width: var(--cell-tile-width);
  }
}
</style>
