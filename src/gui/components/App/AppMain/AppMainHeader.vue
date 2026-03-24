<script lang="ts" setup>
import { reactive } from 'vue';
import MatchStore from '@/gui/stores/MatchStore.ts';
const matchStore = MatchStore.INSTANCE();
const players = reactive([
  {
    name: window.t('game.player_user'),
    score: () => matchStore.userScore,
  },
  {
    name: window.t('game.player_opponent'),
    score: () => matchStore.opponentScore,
  },
]);
</script>

<template>
  <header class="header">
    <div class="header__wrapper app__width-content">
      <p v-for="player in players" :key="player.name" class="header__player">
        {{ player.name }}: <span v-animate-number="{ number: player.score() }" class="header__player-score" />
      </p>
    </div>
  </header>
</template>

<style lang="scss" scoped>
.header {
  width: 100%;
  display: grid;
  place-items: center;
  border-bottom: var(--primary-border);
  z-index: var(--z-index-level-2);
  padding: var(--primary-padding);
  justify-self: center;
  align-self: start;
  height: 6rem;
  &__wrapper {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }
  &__player {
    display: flex;
    align-items: flex-end;
    gap: var(--space-3xs);
    align-items: center;
    font-weight: var(--font-weight);
    flex-direction: row;
    font-size: var(--font-size-big);
  }
}
</style>
