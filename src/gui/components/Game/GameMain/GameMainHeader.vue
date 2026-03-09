<script lang="ts" setup>
import { useStoreGame } from '@/gui/stores/game.ts';

const storeGame = useStoreGame();
</script>

<template>
  <header class="header">
    <div class="header__wrapper game__width-content">
      <!-- <div v-for="player in Object.values(gamePlayers)" :key="player" class="header__player">
        <div class="header__player-info">
          <p class="header__player-name">{{ getPlayerName(player) }}</p>
          <span
            v-animate-number="{
              number: getPlayerScore(player),
            }"
            class="header__player-score"
          />
        </div>
        <svg
          :class="{ 'header__player-avatar': true, 'header__player-avatar--pulsing': isPlayerPendingMove(player) }"
          viewBox="0 0 80 80"
          fill="none"
          role="img"
          xmlns="http://www.w3.org/2000/svg"
          v-html="getPlayerAvatarSvgHtml(player)"
        ></svg>
      </div> -->
    </div>
  </header>
</template>

<style lang="scss" scoped>
.header {
  width: calc(100% + var(--space-s) * 2);
  display: grid;
  place-items: center;
  background: var(--color-gray-faintest);
  box-shadow: var(--box-shadow-level-1);
  z-index: var(--z-index-level-2);
  padding: var(--primary-padding);
  justify-self: center;
  align-self: start;
  height: var(--header-height);
  &__wrapper {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    gap: var(--cell-tile-width);
  }
  &__player {
    display: flex;
    align-items: flex-end;
    gap: calc((var(--cell-tile-gap) * 2 + var(--cell-tile-width)) / 2);
    flex-direction: row-reverse;
    text-align: left;
    align-items: center;
    &:last-child {
      flex-direction: row;
      text-align: right;
    }
  }
  &__player-avatar {
    width: calc(var(--cell-tile-width) * 1.5 + var(--cell-tile-gap));
    border-radius: var(--space-4xs);
    opacity: 0.9;
    &--pulsing {
      animation: rotate calc(var(--transition-duration) * 8) var(--transition-timing-function) infinite;
    }
  }
  &__player-info {
    display: flex;
    flex-direction: column;
    gap: var(--cell-tile-gap);
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: var(--space-xs) 0;
  }
  &__player-name {
    font-size: var(--font-size-big);
  }
  &__player-score {
    font-size: var(--font-size-biggest);
    font-weight: var(--font-weight-small);
  }
}
</style>
