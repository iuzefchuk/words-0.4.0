<script lang="ts" setup>
import { computed } from 'vue';
import { GameBonus, GameCell } from '@/application/types/index.ts';
import AppTile from '@/interface/components/shared/AppTile/AppTile.vue';
import UseEventHandlers from '@/interface/composables/UseEventHandlers.ts';
import { Accent } from '@/interface/enums.ts';
import { getBonusName } from '@/interface/mappings.ts';
import MainStore from '@/interface/stores/MainStore.ts';
import UserStore from '@/interface/stores/UserStore.ts';
const eventHandlers = UseEventHandlers.create();
const props = defineProps<{
  cell: GameCell;
}>();
const mainStore = MainStore.INSTANCE();
const userStore = UserStore.INSTANCE();
const isCenter = computed(() => mainStore.isCellCenter(props.cell));
const bonus = computed(() => mainStore.getCellBonus(props.cell));
const bonusName = computed(() => (bonus.value !== null ? getBonusName(bonus.value) : ''));
const tile = computed(() => mainStore.findTileOnCell(props.cell));
const tileAccent = computed(() => {
  if (tile.value === undefined) return null;
  if (userStore.isTileSelected(tile.value)) return Accent.Primary;
  else if (mainStore.wasTileUsedInPreviousTurn(tile.value)) return Accent.Secondary;
  return Accent.Tertiary;
});
</script>

<template>
  <li
    v-memo="[tile, bonus, tileAccent, tile ? userStore.isTileSelected(tile) : false]"
    :class="{
      cell: true,
      'cell--highlighted': isCenter,
      'cell--occupied': tile !== undefined,
    }"
    @click.stop="eventHandlers.handleClickBoardCell(cell)"
  >
    <Transition name="fade" appear>
      <svg
        v-if="bonus"
        :class="{
          cell__bonus: true,
          'cell__bonus--quaternary': bonus === GameBonus.DoubleLetter,
          'cell__bonus--tertiary': bonus === GameBonus.TripleLetter,
          'cell__bonus--secondary': bonus === GameBonus.DoubleWord,
          'cell__bonus--primary': bonus === GameBonus.TripleWord,
        }"
        class="cell__bonus"
        viewBox="0 0 40 40"
      >
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central">
          {{ bonusName }}
        </text>
      </svg>
    </Transition>
    <Transition name="fade" appear>
      <AppTile
        v-if="tile && tileAccent"
        :letter="mainStore.getTileLetter(tile)"
        :accent="tileAccent"
        @click.stop="eventHandlers.handleClickBoardTile(tile)"
        @dblclick.stop="eventHandlers.handleDoubleClickBoardTile(tile)"
      />
    </Transition>
  </li>
</template>

<style lang="scss" scoped>
.cell {
  max-width: var(--grid-item-size);
  border-radius: var(--grid-item-radius);
  background: var(--cell-bg);
  user-select: none;
  box-shadow: var(--cell-shadow);
  cursor: pointer;
  &--highlighted {
    background: var(--cell-bg-highlighted);
  }
  &--highlighted,
  &--occupied {
    box-shadow: none;
  }
  &__bonus {
    font-weight: var(--font-weight-big);
    z-index: var(--z-index-level-1);
    opacity: var(--cell-opacity-bonus);
    font-size: 15px;
    $accents: 'primary', 'secondary', 'tertiary', 'quaternary';
    @each $accent in $accents {
      &--#{$accent} text {
        fill: var(--cell-color-#{$accent});
      }
    }
  }
  &__tile {
    width: 100%;
    max-width: var(--grid-item-size);
  }
}
</style>
