<script lang="ts" setup>
import { computed } from 'vue';
import { GameMatchDifficulty, GameMatchType } from '@/application/types/index.ts';
import AppSelect from '@/interface/components/shared/AppSelect/AppSelect.vue';
import UseEvents from '@/interface/composables/UseEvents';
import MainStore from '@/interface/stores/MainStore.ts';
type OptionValue = GameMatchDifficulty | GameMatchType;
const mainStore = MainStore.INSTANCE();
const events = UseEvents.create();
const optionsAreDisabled = computed(() => !mainStore.settingsChangeIsAllowed);
const options = [
  {
    items: [
      { text: window.text('game.bonus_distribution_classic'), value: GameMatchType.Classic },
      { text: window.text('game.bonus_distribution_random'), value: GameMatchType.Random },
    ],
    label: window.text('game.settings_bonuses'),
    modelValue: () => mainStore.matchType,
    onChange: (value: OptionValue) => {
      events.handleChangeMatchType(value as GameMatchType);
    },
  },
  {
    items: [
      { text: window.text('game.difficulty_low'), value: GameMatchDifficulty.Low },
      { text: window.text('game.difficulty_medium'), value: GameMatchDifficulty.Medium },
      { text: window.text('game.difficulty_high'), value: GameMatchDifficulty.High },
    ],
    label: window.text('game.settings_difficulty'),
    modelValue: () => mainStore.matchDifficulty,
    onChange: (value: OptionValue) => {
      events.handleChangeMatchDifficulty(value as GameMatchDifficulty);
    },
  },
];
const players = [
  {
    name: window.text('game.player_user'),
    score: () => mainStore.userScore,
  },
  {
    name: window.text('game.player_opponent'),
    score: () => mainStore.opponentScore,
  },
];
</script>

<template>
  <header class="header">
    <Transition name="fade" mode="out-in">
      <div v-if="optionsAreDisabled" class="header__group">
        <p v-for="player in players" :key="player.name">
          {{ player.name }}: <span v-animate-number="{ number: player.score() }" />
        </p>
      </div>
      <div v-else class="header__group">
        <p v-for="{ items, label, modelValue, onChange } in options" :key="label">
          {{ label }}:
          <AppSelect :model-value="modelValue()" :options="items" :is-disabled="false" @change="onChange" />
        </p>
      </div>
    </Transition>
  </header>
</template>

<style lang="scss" scoped>
.header {
  width: 100%;
  z-index: var(--z-index-level-2);
  padding: var(--primary-padding) 0;
  align-self: start;
  &__group {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }
}
</style>
