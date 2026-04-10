<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { GameTile } from '@/application/types/index.ts';
import AppTile from '@/presentation/components/shared/AppTile/AppTile.vue';
import MainStore from '@/presentation/stores/MainStore.ts';
import RackStore from '@/presentation/stores/RackStore.ts';
const mainStore = MainStore.INSTANCE();
const rackStore = RackStore.INSTANCE();
const { allActionsAreDisabled, tilesRemaining } = storeToRefs(mainStore);
const { tiles } = storeToRefs(rackStore);
const paddedTiles = computed<Array<GameTile | null>>(() => {
  const result: Array<GameTile | null> = [...tiles.value];
  while (result.length < mainStore.tilesPerPlayer) result.push(null);
  return result;
});
</script>

<template>
  <ul class="rack app__limit-max-width app__create-grid--for-rack">
    <li
      v-for="(tile, idx) in paddedTiles"
      :key="idx"
      :class="{ rack__cell: true, 'rack__cell--disabled': allActionsAreDisabled }"
      @click.stop="tile !== null && rackStore.handleClickFooterCell(idx)"
    >
      <AppTile
        v-if="tile !== null && rackStore.isTileVisible(tile)"
        :letter="mainStore.getTileLetter(tile)"
        :is-inverted="rackStore.isTileSelected(tile)"
        @click.stop="rackStore.handleClickFooterTile(tile)"
      />
    </li>
    <Transition name="fade">
      <li v-if="tilesRemaining > 0" class="rack__count app__make-secondary">
        <p>
          <span v-animate-number="{ number: tilesRemaining }" class="rack__count-item" />
          {{ t('game.unassigned_count') }}
        </p>
      </li>
    </Transition>
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
    align-items: flex-start;
    justify-content: flex-start;
    user-select: none;
  }
}
</style>
