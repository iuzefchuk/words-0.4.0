<script lang="ts" setup>
// TODO add one of the texts depending on gameResult:
// t('game.end_win'), t('game.end_lose'), t('game.end_tie')
</script>

<template>
  <div class="endscreen">END</div>
</template>

<style lang="scss">
.endscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  z-index: var(--z-index-level-3);
  color: var(--primary-color);
}
</style>
