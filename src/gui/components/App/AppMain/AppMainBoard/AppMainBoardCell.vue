<script lang="ts" setup>
import { computed } from 'vue';
import { GameBonus, GameCell } from '@/application/types.ts';
import GameTile from '@/gui/components/shared/AppTile.vue';
import { getBonusName } from '@/gui/mappings.ts';
import MatchStore from '@/gui/stores/MatchStore.ts';
import RackStore from '@/gui/stores/RackStore.ts';
const props = defineProps<{
  cell: GameCell;
}>();
const matchStore = MatchStore.INSTANCE();
const rackStore = RackStore.INSTANCE();
const isCellCenter = computed(() => matchStore.isCellCenter(props.cell));
const bonus = computed(() => matchStore.getCellBonus(props.cell));
const bonusName = computed(() => (bonus.value ? getBonusName(bonus.value) : ''));
const tile = computed(() => matchStore.findTileOnCell(props.cell));
const isTileSaturated = computed(() => tile.value != null && matchStore.wasTileUsedInPreviousTurn(tile.value));
</script>

<template>
  <li
    :class="{
      cell: true,
      'cell--center': isCellCenter,
      'cell--has-tile': tile,
    }"
    @click.stop="rackStore.handleClickBoardCell(cell)"
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
        :letter="matchStore.getTileLetter(tile)"
        :is-inverted="rackStore.isTileSelected(tile)"
        :is-saturated="isTileSaturated"
        @click.stop="rackStore.handleClickBoardTile(tile)"
        @dblclick.stop="rackStore.handleDoubleClickBoardTile(tile)"
      />
    </Transition>
    <slot />
  </li>
</template>

<style lang="scss" scoped>
.cell {
  max-width: var(--cell-tile-width);
  aspect-ratio: 1 / 1;
  border-radius: var(--primary-border-radius);
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
