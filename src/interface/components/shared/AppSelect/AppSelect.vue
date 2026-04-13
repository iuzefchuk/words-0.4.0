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
  <div :class="{ select: true, 'select--disabled': isDisabled }">
    <button class="select__custom">
      {{ options.find(option => option.value === modelValue)?.text }}
    </button>
    <select v-model="selectedOption" :disabled="isDisabled" class="select__native">
      <option v-for="option in options" :key="option.text" :value="option.value">
        {{ option.text }}
      </option>
    </select>
  </div>
</template>

<style lang="scss" scoped>
.select {
  position: relative;
  display: inline-block;
  &__custom {
    text-decoration: underline;
  }
  &__native {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }
  &--disabled {
    .select__custom {
      pointer-events: none;
      text-decoration: none;
    }
    .select__native {
      cursor: not-allowed;
    }
  }
}
</style>
