<script lang="ts" setup>
import GameMainFooterRack from '@/gui/components/Game/GameMain/GameMainFooter/GameMainFooterRack.vue';
import GameMainFooterButtons from '@/gui/components/Game/GameMain/GameMainFooter/GameMainFooterButtons.vue';
</script>

<template>
  <footer class="footer">
    <GameMainFooterRack />
    <GameMainFooterButtons />
  </footer>
</template>

<style lang="scss" scoped>
.footer {
  z-index: 1;
  justify-self: center;
  align-self: end;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-m);
  width: 100%;
  margin-bottom: var(--space-l);
}
</style>
