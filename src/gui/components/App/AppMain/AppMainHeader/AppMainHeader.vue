<script lang="ts" setup>
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
</script>

<template>
  <header class="header">
    <p>
      {{ t('game.settings_bonuses') }}:
      <AppMainHeaderSelect :text="t('game.bonus_distribution_classic')" />
    </p>
    <p>
      {{ t('game.settings_difficulty') }}:
      <AppMainHeaderSelect :text="t('game.difficulty_low')" />
    </p>
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
