<script lang="ts" setup>
import { computed } from 'vue';
import { GameLetter } from '@/application/types/index.ts';
import { Accent } from '@/interface/enums.ts';
import MainStore from '@/interface/stores/MainStore.ts';
const props = defineProps<{
  accent: Accent;
  letter: GameLetter;
}>();
const mainStore = MainStore.INSTANCE();
const points = computed(() => mainStore.getLetterPoints(props.letter));
</script>

<template>
  <svg
    :class="{
      tile: true,
      'tile--primary': props.accent === Accent.Primary,
      'tile--secondary': props.accent === Accent.Secondary,
      'tile--tertiary': props.accent === Accent.Tertiary,
    }"
    viewBox="0 0 40 40"
  >
    <text class="tile__letter" x="45%" y="45%" font-size="22" text-anchor="middle" dominant-baseline="central">{{ letter }}</text>
    <text class="tile__points" x="78%" y="78%" font-size="13" text-anchor="middle" dominant-baseline="central">{{ points }}</text>
  </svg>
</template>

<style lang="scss" scoped>
.tile {
  cursor: pointer;
  fill: currentColor;
  aspect-ratio: 1 / 1;
  border-radius: inherit;
  box-shadow: var(--shadow);
  transition-property: background, color, outline;
  transition-duration: var(--transition-duration-half);
  transition-timing-function: var(--transition-timing-function);
  position: relative;
  top: 0;
  left: 0;
  z-index: var(--z-index-level-1);
  min-height: 100%;
  $accents: 'primary', 'secondary', 'tertiary';
  @each $accent in $accents {
    &--#{$accent} {
      background: var(--tile-bg-#{$accent});
      color: var(--tile-color-#{$accent});
      .tile__points {
        color: var(--tile-pts-color-#{$accent});
      }
    }
  }
  &__letter {
    font-weight: var(--font-weight-big);
  }
}
</style>
