<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import DomainTile from '@/gui/components/shared/AppTile.vue';
import UseActions from '@/gui/composables/UseActions.ts';
import MatchStore from '@/gui/stores/MatchStore.ts';
import RackStore from '@/gui/stores/RackStore.ts';
const matchStore = MatchStore.INSTANCE();
const rackStore = RackStore.INSTANCE();
const { tilesRemaining } = storeToRefs(matchStore);
const { tiles } = storeToRefs(rackStore);
const actions = new UseActions();
const { allActionsAreDisabled } = actions;
</script>

<template>
  <ul class="rack app__width-content app__grid--footer">
    <li
      v-for="(tile, idx) in tiles"
      :key="idx"
      :class="{ rack__cell: true, 'rack__cell--disabled': allActionsAreDisabled }"
      @click.stop="rackStore.handleClickFooterCell(idx)"
    >
      <DomainTile
        v-if="rackStore.isTileVisible(tile)"
        :letter="matchStore.getTileLetter(tile)"
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
  &__cell {
    cursor: pointer;
    background: var(--cell-bg-footer);
    border-radius: calc(var(--primary-border-radius) * 2);
    box-shadow: var(--cell-shadow-footer);
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
    align-items: center;
    justify-content: center;
    color: var(--secondary-color);
    font-size: var(--font-size-small);
    user-select: none;
  }
  &__count-item {
    width: max-content;
    height: max-content;
    position: static;
  }
}
</style>
