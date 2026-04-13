<template>
  <section class="loader">
    <p class="loader__dots">
      <span>.</span>
      <span>.</span>
      <span>.</span>
    </p>
  </section>
</template>

<script lang="ts" setup></script>

<style lang="scss" scoped>
.loader {
  display: grid;
  place-items: center;
  height: 100vh;
  width: 100vw;
  &__dots > * {
    $ms: 0.5s;
    font-size: 3rem;
    opacity: 0;
    animation: dots $ms infinite;
    &:nth-child(1) {
      animation-delay: 0s;
    }
    &:nth-child(2) {
      animation-delay: calc($ms / 4);
    }
    &:nth-child(3) {
      animation-delay: calc($ms / 2);
    }
  }
}
@keyframes dots {
  0% {
    opacity: 0;
  }
  20% {
    opacity: 1;
  }
  70% {
    opacity: 1;
  }
  85% {
    opacity: 0;
  }
  100% {
    opacity: 0;
  }
}
</style>
