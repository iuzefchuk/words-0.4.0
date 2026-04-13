<script lang="ts" setup>
import MainFooterButtons from '@/interface/components/by-hierarchy/Main/MainFooter/MainFooterButtons.vue';
import MainFooterRack from '@/interface/components/by-hierarchy/Main/MainFooter/MainFooterRack.vue';
</script>

<template>
  <footer class="footer">
    <MainFooterRack />
    <MainFooterButtons />
  </footer>
</template>

<style lang="scss" scoped>
.footer {
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
