<script lang="ts" setup>
import { computed } from 'vue';
import { GameBoardType, GameDifficulty } from '@/application/types/index.ts';
import AppSelect from '@/presentation/components/shared/AppSelect/AppSelect.vue';
import MainStore from '@/presentation/stores/MainStore.ts';
type OptionValue = GameBoardType | GameDifficulty;
const mainStore = MainStore.INSTANCE();
const optionsAreDisabled = computed(() => !mainStore.settingsChangeIsAllowed);
const options = [
  {
    items: [
      { text: window.t('game.bonus_distribution_classic'), value: GameBoardType.Classic },
      { text: window.t('game.bonus_distribution_random'), value: GameBoardType.Random },
    ],
    label: window.t('game.settings_bonuses'),
    modelValue: () => mainStore.boardType,
    onChange: (value: OptionValue) => mainStore.changeBoardType(value as GameBoardType),
  },
  {
    items: [
      { text: window.t('game.difficulty_low'), value: GameDifficulty.Low },
      { text: window.t('game.difficulty_medium'), value: GameDifficulty.Medium },
      { text: window.t('game.difficulty_high'), value: GameDifficulty.High },
    ],
    label: window.t('game.settings_difficulty'),
    modelValue: () => mainStore.difficulty,
    onChange: (value: OptionValue) => mainStore.changeDifficulty(value as GameDifficulty),
  },
];
const players = [
  {
    name: window.t('game.player_user'),
    score: () => mainStore.userScore,
  },
  {
    name: window.t('game.player_opponent'),
    score: () => mainStore.opponentScore,
  },
];
</script>

<template>
  <header class="header">
    <Transition name="fade" mode="out-in">
      <div v-if="optionsAreDisabled" class="header__group">
        <p v-for="player in players" :key="player.name">{{ player.name }}: <span v-animate-number="{ number: player.score() }" /></p>
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
