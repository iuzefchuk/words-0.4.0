<script lang="ts" setup>
import { ref } from 'vue';
const selected = ref('A');
const options = ref([
  { text: 'One', value: 'A' },
  { text: 'Two', value: 'B' },
  { text: 'Three', value: 'C' },
]);
</script>

<template>
  <select v-model="selected" class="select">
    <option v-for="option in options" :key="option.text" :value="option.value">
      {{ option.text }}
    </option>
  </select>
</template>

<style lang="scss" scoped>
.select {
  border: none;
  background: transparent;
  padding: 0;
  font-size: inherit;
  font-weight: inherit;
  border-bottom: var(--primary-border);
  cursor: pointer;
}
</style>
