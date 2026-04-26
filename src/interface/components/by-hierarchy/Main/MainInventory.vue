<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { GameTile } from '@/application/types/index.ts';
import AppTile from '@/interface/components/shared/AppTile/AppTile.vue';
import UseEventHandlers from '@/interface/composables/UseEventHandlers.ts';
import { Accent } from '@/interface/enums.ts';
import MainStore from '@/interface/stores/MainStore.ts';
import UserStore from '@/interface/stores/UserStore.ts';
const eventHandlers = UseEventHandlers.create();
const mainStore = MainStore.INSTANCE();
const userStore = UserStore.INSTANCE();
const { allActionsAreDisabled, tilesRemaining } = storeToRefs(mainStore);
const { tiles } = storeToRefs(userStore);
const paddedTiles = computed<Array<GameTile | null>>(() => {
  const result: Array<GameTile | null> = [...tiles.value];
  while (result.length < mainStore.tilesPerPlayer) result.push(null);
  return result;
});
</script>

<template>
  <section class="inventory">
    <ul
      :class="{
        inventory__grid: true,
        'app__limit-max-width': true,
        'app__create-grid--for-inventory': true,
      }"
    >
      <li
        v-for="(tile, idx) in paddedTiles"
        :key="idx"
        :class="{
          inventory__cell: true,
          'inventory__cell--disabled': allActionsAreDisabled,
        }"
        @click.stop="tile !== null && eventHandlers.handleClickInventoryCell(idx)"
      >
        <AppTile
          v-if="tile !== null && userStore.isTileInInventory(tile) && !mainStore.isTilePlaced(tile)"
          :letter="mainStore.getTileLetter(tile)"
          :accent="userStore.isTileSelected(tile) ? Accent.Primary : Accent.Tertiary"
          @click.stop="eventHandlers.handleClickInventoryTile(tile)"
        />
      </li>
      <Transition name="fade">
        <li
          v-if="tilesRemaining > 0"
          :class="{
            inventory__count: true,
            'app__make-secondary': true,
          }"
        >
          <p>
            <span v-animate-number="{ number: tilesRemaining }" class="inventory__count-item" />
            {{ text('game.unassigned_count') }}
          </p>
        </li>
      </Transition>
    </ul>
  </section>
</template>

<style lang="scss" scoped>
.inventory {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-l);
  &__cell {
    cursor: pointer;
    background: var(--inventory-bg);
    border-radius: calc(var(--grid-item-radius) * 2);
    box-shadow: var(--inventory-shadow);
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
    padding: 0 var(--space-3xs);
  }
}
</style>
