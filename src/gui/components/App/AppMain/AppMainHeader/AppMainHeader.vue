<script lang="ts" setup>
import { computed } from 'vue';
import { GameBonusDistribution, GameDifficulty } from '@/application/types.ts';
import AppMainHeaderSelect from '@/gui/components/App/AppMain/AppMainHeader/AppMainHeaderSelect.vue';
import MatchStore from '@/gui/stores/MatchStore.ts';
const matchStore = MatchStore.INSTANCE();
const optionsAreDisabled = computed(() => !matchStore.settingsChangeIsAllowed);
const options = [
  {
    items: [
      { text: window.t('game.bonus_distribution_classic'), value: GameBonusDistribution.Classic },
      { text: window.t('game.bonus_distribution_random'), value: GameBonusDistribution.Random },
    ],
    label: window.t('game.settings_bonuses'),
    modelValue: () => matchStore.bonusDistribution,
    onChange: value => matchStore.changeBonusDistribution(value), // TODO value typing
  },
  {
    items: [
      { text: window.t('game.difficulty_low'), value: GameDifficulty.Low },
      { text: window.t('game.difficulty_medium'), value: GameDifficulty.Medium },
      { text: window.t('game.difficulty_high'), value: GameDifficulty.High },
    ],
    label: window.t('game.settings_difficulty'),
    modelValue: () => matchStore.difficulty,
    onChange: value => matchStore.changeDifficulty(value),
  },
];
const players = [
  {
    name: window.t('game.player_user'),
    score: () => matchStore.userScore,
  },
  {
    name: window.t('game.player_opponent'),
    score: () => matchStore.opponentScore,
  },
];
</script>

<template>
  <header class="header">
    <p
      v-for="{ items, label, modelValue, onChange } in options"
      :key="label"
      :class="{ header__item: true, 'header__item--disabled': optionsAreDisabled }"
    >
      {{ label }}:
      <AppMainHeaderSelect
        :model-value="modelValue()"
        :options="items"
        :is-disabled="optionsAreDisabled"
        @change="onChange"
      />
    </p>
    <p v-for="player in players" :key="player.name">
      {{ player.name }}: <span v-animate-number="{ number: player.score() }" />
    </p>
  </header>
</template>

<style lang="scss" scoped>
.header {
  width: 100%;
  z-index: var(--z-index-level-2);
  padding: var(--primary-padding) 0;
  align-self: start;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  &__item {
    &--disabled {
      color: var(--secondary-color);
    }
  }
}
</style>
