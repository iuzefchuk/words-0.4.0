<script lang="ts" setup>
import AppMainFooterGrid from '@/gui/components/App/AppMain/AppMainFooter/AppMainFooterGrid.vue';
import AppMainFooterButtons from '@/gui/components/App/AppMain/AppMainFooter/AppMainFooterButtons.vue';
</script>

<template>
  <footer class="footer">
    <AppMainFooterGrid />
    <AppMainFooterButtons />
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
