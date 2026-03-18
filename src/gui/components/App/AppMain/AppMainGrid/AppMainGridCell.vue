<script lang="ts" setup>
import AppTile from '@/gui/components/shared/AppTile.vue';
import { GameCell } from '@/application/types.ts';
import { PropType, computed } from 'vue';
import GameStore from '@/gui/stores/GameStore.ts';
import ItemsStore from '@/gui/stores/ItemsStore.ts';
import { getBonusName } from '@/gui/mappings.ts';
const props = defineProps({ cell: { type: Number as unknown as PropType<GameCell>, required: true } });
const gameStore = GameStore.getInstance();
const itemsStore = ItemsStore.getInstance();
const bonus = computed(() => gameStore.getCellBonus(props.cell));
const bonusName = computed(() => (bonus.value ? getBonusName(bonus.value) : ''));
const tile = computed(() => gameStore.findTileOnCell(props.cell));
const isTileHighlighted = computed(() => tile.value != null && gameStore.wasTileUsedInPreviousTurn(tile.value));
</script>

<template>
  <li
    :class="{
      cell: true,
      'cell--center': gameStore.isCellInCenterOfLayout(cell),
      'cell--has-tile': tile,
    }"
    @click="itemsStore.handleClickBoardCell(cell)"
  >
    <Transition name="fade" appear>
      <svg
        v-if="bonus"
        :class="{
          cell__bonus: true,
          'cell__bonus--dw': bonus === gameStore.bonuses.DoubleWord,
          'cell__bonus--tw': bonus === gameStore.bonuses.TripleWord,
          'cell__bonus--dl': bonus === gameStore.bonuses.DoubleLetter,
          'cell__bonus--tl': bonus === gameStore.bonuses.TripleLetter,
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
        :letter="gameStore.getTileLetter(tile)"
        :is-inverted="itemsStore.isTileSelected(tile)"
        :is-highlighted="isTileHighlighted"
        :is-elevated="itemsStore.isTileInItems(tile)"
        @click.stop="itemsStore.handleClickBoardTile(tile)"
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
  box-shadow: var(--box-shadow-level-0);
  user-select: none;
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
