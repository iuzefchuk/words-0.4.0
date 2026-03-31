<script lang="ts" setup generic="T extends string">
import { computed } from 'vue';
const props = defineProps<{
  isDisabled: boolean;
  modelValue: T;
  options: Array<{ text: string; value: T }>;
}>();
const emit = defineEmits<{
  change: [value: T];
}>();
const selectedOption = computed({
  get: () => props.modelValue,
  set: value => emit('change', value),
});
</script>

<template>
  <select v-model="selectedOption" :class="{ select: true, 'select--disabled': isDisabled }">
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
  &--disabled {
    opacity: var(--opacity-disabled);
    pointer-events: none;
  }
}
</style>
