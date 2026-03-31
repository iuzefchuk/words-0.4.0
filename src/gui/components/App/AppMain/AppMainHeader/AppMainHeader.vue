<script lang="ts" setup>
import { GameBonusDistribution } from '@/application/types.ts';
import AppMainHeaderSelect from '@/gui/components/App/AppMain/AppMainHeader/AppMainHeaderSelect.vue';
import MatchStore from '@/gui/stores/MatchStore.ts';
const matchStore = MatchStore.INSTANCE();
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
const options = [
  { text: window.t('game.bonus_distribution_classic'), value: GameBonusDistribution.Classic },
  { text: window.t('game.bonus_distribution_random'), value: GameBonusDistribution.Random },
];
</script>

<template>
  <header class="header">
    <Transition name="fade">
      <template v-if="!matchStore.hasPriorTurns">
        <p>
          {{ t('game.settings_bonuses') }}:
          <AppMainHeaderSelect
            :model-value="matchStore.bonusDistribution"
            :options="options"
            @change="matchStore.changeBonusDistribution"
          />
        </p>
        <!-- <p>
      {{ t('game.settings_difficulty') }}:
      <AppMainHeaderSelect :text="t('game.difficulty_low')" />
    </p> -->
      </template>
    </Transition>
    <p v-for="player in players" :key="player.name">
      {{ player.name }}: <span v-animate-number="{ number: player.score() }" class="header__player-score" />
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
  &__player-score {
    font-weight: var(--font-weight);
  }
}
</style>
