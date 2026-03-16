<script lang="ts" setup>
import { reactive } from 'vue';
import GameStore from '@/gui/stores/GameStore.ts';
import { PLAYER_AVATAR_SVG_HTML } from '@/gui/constants.ts';
const storeGame = GameStore.getInstance();
const players = reactive([
  {
    name: window.t('game.player_user'),
    get score() {
      return storeGame.userScore;
    },
    get isPendingMove() {
      return storeGame.currentPlayerIsUser;
    },
    avatarSvgHtml: PLAYER_AVATAR_SVG_HTML[0],
  },
  {
    name: window.t('game.player_opponent'),
    get score() {
      return storeGame.opponentScore;
    },
    get isPendingMove() {
      return !storeGame.currentPlayerIsUser;
    },
    avatarSvgHtml: PLAYER_AVATAR_SVG_HTML[1],
  },
]);
</script>

<template>
  <header class="header">
    <div class="header__wrapper app__width-content">
      <p v-for="player in players" :key="player.name" class="header__player">
        {{ player.name }}: <span v-animate-number="{ number: player.score }" class="header__player-score" />
      </p>
    </div>
  </header>
</template>

<style lang="scss" scoped>
.header {
  width: calc(100% + var(--space-s) * 2);
  display: grid;
  place-items: center;
  border-bottom: 1.5px solid var(--color-gray);
  z-index: var(--z-index-level-2);
  padding: var(--primary-padding);
  justify-self: center;
  align-self: start;
  height: var(--header-height);
  &__wrapper {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }
  &__player {
    display: flex;
    align-items: flex-end;
    gap: var(--space-3xs);
    align-items: center;
    font-weight: var(--font-weight);
    flex-direction: row;
  }
}
</style>
