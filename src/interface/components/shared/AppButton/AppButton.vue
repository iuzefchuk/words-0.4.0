<script lang="ts" setup>
import { Accent } from '@/interface/enums.ts';
defineProps<{
  accent: Accent;
  isDisabled: boolean;
}>();
defineEmits<{
  click: [];
}>();
</script>

<template>
  <button
    :class="{
      btn: true,
      'btn--primary': accent === Accent.Primary,
      'btn--secondary': accent === Accent.Secondary,
      'btn--tertiary': accent === Accent.Tertiary,
      'btn--quaternary': accent === Accent.Quaternary,
    }"
    :disabled="isDisabled"
    @click="$emit('click')"
  >
    <slot />
  </button>
</template>

<style lang="scss" scoped>
.btn {
  cursor: pointer;
  text-align: center;
  border-radius: var(--btn-radius);
  user-select: none;
  transition-property: box-shadow;
  transition-duration: var(--transition-duration);
  transition-timing-function: var(--transition-timing-function);
  border: 1px solid transparent;
  font-size: var(--btn-font-size);
  font-weight: var(--btn-font-weight);
  display: grid;
  place-items: center;
  width: 5rem;
  height: 2.25rem;
  $accents: 'primary', 'secondary', 'tertiary', 'quaternary';
  @each $accent in $accents {
    &--#{$accent} {
      background: var(--btn-bg-#{$accent});
      color: var(--btn-color-#{$accent});
      border-color: var(--btn-border-color-#{$accent});
      box-shadow: var(--shadow-xs);
      &:hover:not(:active):not(:disabled) {
        background: var(--btn-bg-#{$accent}-hover);
        color: var(--btn-color-#{$accent}-hover);
        border-color: var(--btn-border-color-#{$accent}-hover);
        box-shadow: var(--shadow-s);
      }
      &:active:not(:disabled) {
        background: var(--btn-bg-#{$accent}-active);
        color: var(--btn-color-#{$accent}-active);
        border-color: var(--btn-border-color-#{$accent}-active);
      }
    }
  }
  &:disabled {
    cursor: not-allowed;
    background: var(--btn-bg-disabled);
    color: var(--btn-color-disabled);
    border-color: var(--btn-border-color-disabled);
    box-shadow: none;
  }
}
</style>
