<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import UseButtons from '@/presentation/components/by-hierarchy/Main/MainFooter/MainFooterButtons/UseButtons.ts';
import GameTile from '@/presentation/components/shared/AppTile/AppTile.vue';
import MainStore from '@/presentation/stores/MainStore.ts';
import RackStore from '@/presentation/stores/RackStore.ts';
const mainStore = MainStore.INSTANCE();
const rackStore = RackStore.INSTANCE();
const { tilesRemaining } = storeToRefs(mainStore);
const { tiles } = storeToRefs(rackStore);
const buttons = UseButtons.create();
const { allActionsAreDisabled } = buttons; // TODO move allActionsAreDisabled to main store
</script>

<template>
  <ul class="rack app__width-content app__grid--footer">
    <li
      v-for="(tile, idx) in tiles"
      :key="tile"
      :class="{ rack__cell: true, 'rack__cell--disabled': allActionsAreDisabled }"
      @click.stop="rackStore.handleClickFooterCell(idx)"
    >
      <GameTile
        v-if="rackStore.isTileVisible(tile)"
        :letter="mainStore.getTileLetter(tile)"
        :is-inverted="rackStore.isTileSelected(tile)"
        @click.stop="rackStore.handleClickFooterTile(tile)"
      />
    </li>
    <li class="rack__count">
      <p>
        <span v-animate-number="{ number: tilesRemaining }" class="rack__count-item" />
        {{ t('game.unassigned_count') }}
      </p>
    </li>
  </ul>
</template>

<style lang="scss" scoped>
.rack {
  --tile-radius: calc(var(--primary-border-radius) * 2);
  &__cell {
    cursor: pointer;
    filter: drop-shadow(0 1px transparent);
    &::before {
      content: '';
      background: var(--cell-bg-footer);
      grid-area: 1 / 1;
      clip-path: inset(0 round var(--tile-radius));
    }
    &--disabled {
      opacity: var(--opacity-disabled);
      cursor: not-allowed;
      & > * {
        pointer-events: none;
      }
    }
  }
  &__count {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    color: var(--secondary-color);
    font-size: var(--font-size-small);
    user-select: none;
  }
}
</style>
