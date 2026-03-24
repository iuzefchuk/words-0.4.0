<script lang="ts" setup>
import { PropType, computed } from 'vue';
import { DomainCell, DomainBonus } from '@/application/types.ts';
import DomainTile from '@/gui/components/shared/AppTile.vue';
import MatchStore from '@/gui/stores/MatchStore.ts';
import RackStore from '@/gui/stores/RackStore.ts';
const props = defineProps({ cell: { type: Number as unknown as PropType<DomainCell>, required: true } });
const matchStore = MatchStore.INSTANCE();
const rackStore = RackStore.INSTANCE();
const bonus = computed(() => matchStore.getCellBonus(props.cell));
const bonusName = computed(() => (bonus.value ? matchStore.getBonusName(bonus.value) : ''));
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
          'cell__bonus--dw': bonus === DomainBonus.DoubleWord,
          'cell__bonus--tw': bonus === DomainBonus.TripleWord,
          'cell__bonus--dl': bonus === DomainBonus.DoubleLetter,
          'cell__bonus--tl': bonus === DomainBonus.TripleLetter,
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
      <DomainTile
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
