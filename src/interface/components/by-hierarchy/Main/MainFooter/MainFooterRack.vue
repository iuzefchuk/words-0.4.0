<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { GameTile } from '@/application/types/index.ts';
import AppTile from '@/interface/components/shared/AppTile/AppTile.vue';
import UseEventHandlers from '@/interface/composables/UseEventHandlers.ts';
import ApplicationStore from '@/interface/stores/ApplicationStore.ts';
import InventoryStore from '@/interface/stores/InventoryStore.ts';
const events = UseEventHandlers.create();
const applicationStore = ApplicationStore.INSTANCE();
const inventoryStore = InventoryStore.INSTANCE();
const { allActionsAreDisabled, tilesRemaining } = storeToRefs(applicationStore);
const { tiles } = storeToRefs(inventoryStore);
const paddedTiles = computed<Array<GameTile | null>>(() => {
  const result: Array<GameTile | null> = [...tiles.value];
  while (result.length < applicationStore.tilesPerPlayer) result.push(null);
  return result;
});
</script>

<template>
  <ul class="rack app__limit-max-width app__create-grid--for-rack">
    <li
      v-for="(tile, idx) in paddedTiles"
      :key="idx"
      :class="{ rack__cell: true, 'rack__cell--disabled': allActionsAreDisabled }"
      @click.stop="tile !== null && events.handleClickRackCell(idx)"
    >
      <AppTile
        v-if="tile !== null && inventoryStore.isTileVisible(tile)"
        :letter="applicationStore.getTileLetter(tile)"
        :is-inverted="inventoryStore.isTileSelected(tile)"
        @click.stop="events.handleClickRackTile(tile)"
      />
    </li>
    <Transition name="fade">
      <li v-if="tilesRemaining > 0" class="rack__count app__make-secondary">
        <p>
          <span v-animate-number="{ number: tilesRemaining }" class="rack__count-item" />
          {{ text('game.unassigned_count') }}
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
    border-radius: calc(var(--cell-tile-border-radius) * 2);
    box-shadow: var(--cell-shadow-footer);
    --shadow-color: var(--cell-shadow-color-footer);
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
