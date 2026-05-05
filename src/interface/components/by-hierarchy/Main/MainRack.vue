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
  <section class="rack">
    <ul
      :class="{
        rack__grid: true,
        'app__limit-max-width': true,
        'app__create-grid--for-rack': true,
      }"
    >
      <li
        v-for="(tile, idx) in paddedTiles"
        :key="idx"
        :class="{
          rack__cell: true,
          'rack__cell--disabled': allActionsAreDisabled,
        }"
        @click.stop="tile !== null && eventHandlers.handleClickRackCell(idx)"
      >
        <AppTile
          v-if="tile !== null && userStore.isTileInRack(tile) && !mainStore.isTilePlaced(tile)"
          :letter="mainStore.getTileLetter(tile)"
          :accent="userStore.isTileSelected(tile) ? Accent.Primary : Accent.Tertiary"
          @click.stop="eventHandlers.handleClickRackTile(tile)"
        />
      </li>
      <Transition name="fade">
        <p
          v-if="tilesRemaining > 0"
          :class="{
            rack__count: true,
            'app__make-secondary': true,
          }"
        >
          <span v-animate-number="{ number: tilesRemaining }" class="rack__count-item" />
          {{ text('general.unassigned_count') }}
        </p>
      </Transition>
    </ul>
  </section>
</template>

<style lang="scss" scoped>
.rack {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-l);
  &__cell {
    cursor: pointer;
    background: var(--rack-cell-bg);
    border-radius: calc(var(--grid-item-radius) * 2);
    box-shadow: var(--rack-cell-shadow);
    &--disabled {
      cursor: not-allowed;
      & > * {
        pointer-events: none;
      }
    }
  }
  &__count {
    display: flex;
    gap: var(--space-2xs);
    user-select: none;
  }
}
</style>
