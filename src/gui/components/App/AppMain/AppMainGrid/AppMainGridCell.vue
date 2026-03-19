<script lang="ts" setup>
import AppTile from '@/gui/components/shared/AppTile.vue';
import { GameCell } from '@/application/Game.ts';
import { PropType, computed } from 'vue';
import MatchStore from '@/gui/stores/MatchStore.ts';
import RackStore from '@/gui/stores/RackStore.ts';
import { getBonusName } from '@/gui/mappings.ts';
const props = defineProps({ cell: { type: Number as unknown as PropType<GameCell>, required: true } });
const matchStore = MatchStore.INSTANCE();
const rackStore = RackStore.INSTANCE();
const bonus = computed(() => matchStore.getCellBonus(props.cell));
const bonusName = computed(() => (bonus.value ? getBonusName(bonus.value) : ''));
const tile = computed(() => matchStore.findTileOnCell(props.cell));
const isTileSaturated = computed(() => tile.value != null && matchStore.wasTileUsedInPreviousTurn(tile.value));
</script>

<template>
  <li
    :class="{
      cell: true,
      'cell--center': matchStore.isCellInCenterOfLayout(cell),
      'cell--has-tile': tile,
    }"
    @click.stop="rackStore.handleClickBoardCell(cell)"
  >
    <Transition name="fade" appear>
      <svg
        v-if="bonus"
        :class="{
          cell__bonus: true,
          'cell__bonus--dw': bonus === matchStore.bonuses.DoubleWord,
          'cell__bonus--tw': bonus === matchStore.bonuses.TripleWord,
          'cell__bonus--dl': bonus === matchStore.bonuses.DoubleLetter,
          'cell__bonus--tl': bonus === matchStore.bonuses.TripleLetter,
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
      <AppTile
        v-if="tile"
        :letter="matchStore.getTileLetter(tile)"
        :is-inverted="rackStore.isTileSelected(tile)"
        :is-saturated="isTileSaturated"
        :is-outlined="rackStore.isTileInRack(tile)"
        @click.stop="rackStore.handleClickBoardTile(tile)"
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
