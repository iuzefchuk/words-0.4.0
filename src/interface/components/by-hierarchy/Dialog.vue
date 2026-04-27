<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import { onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import DialogStore, { DialogStatus } from '@/interface/stores/DialogStore.ts';
const dialogStore = DialogStore.INSTANCE();
const { cancelText, confirmText, html, title } = storeToRefs(dialogStore);
const exitAnimation = ref(false);
const isRendered = ref(false);
function respond(status: DialogStatus): void {
  isRendered.value = false;
  dialogStore.resolve({ status });
}
const buttons = reactive([
  {
    keys: ['Enter'],
    status: DialogStatus.Confirmed,
    text: () => confirmText.value,
  },
  {
    keys: ['Escape'],
    status: DialogStatus.Canceled,
    text: () => cancelText.value,
  },
]);
function handleKeydown(event: KeyboardEvent): void {
  if (!isRendered.value) return;
  const button = buttons.find(button => button.keys.includes(event.key));
  if (button === undefined) return;
  event.stopImmediatePropagation();
  respond(button.status);
}
function toggleExitAnimation(): void {
  exitAnimation.value = true;
  setTimeout(() => {
    exitAnimation.value = false;
  }, 250);
}
watch(html, newValue => {
  if (newValue !== null) isRendered.value = true;
});
onMounted(() => {
  window.addEventListener('keydown', handleKeydown, true);
});
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown, true);
});
</script>

<template>
  <section v-if="isRendered" class="dialog" @mousedown="toggleExitAnimation">
    <Transition name="fade-down-up" appear>
      <dialog
        open
        :class="{ dialog__window: true, 'dialog__window--shaking': exitAnimation, 'app__limit-max-width': true }"
        @mousedown.stop
      >
        <div class="dialog__content">
          <p v-if="title" class="dialog__content-title">{{ title }}</p>
          <p v-html="html" />
        </div>
        <div class="dialog__footer">
          <button v-for="button in buttons" :key="button.status" class="dialog__button" @click="respond(button.status)">
            {{ button.text() }}
          </button>
        </div>
      </dialog>
    </Transition>
  </section>
</template>

<style lang="scss" scoped>
.dialog {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: var(--z-index-level-2);
  display: grid;
  place-items: center;
  &__window {
    padding: var(--space-xl) var(--space-2xl);
    border-radius: var(--dialog-radius);
    background: var(--dialog-bg);
    color: var(--dialog-color);
    width: max-content;
    border: none;
    &--shaking {
      animation: horizontal-shake var(--transition-duration) linear forwards;
    }
  }
  &__content {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
    font-weight: var(--font-weight-small);
  }
  &__content-title {
    font-size: var(--font-size-big);
    line-height: var(--line-height-big);
  }
  &__footer {
    display: flex;
    flex-direction: row;
    justify-content: center;
    gap: var(--space-m);
    padding-top: var(--space-2xl);
    padding-bottom: var(--space-xs);
  }
  &__button {
    cursor: pointer;
    padding: var(--space-s) var(--space-6xl);
    border: 1px solid transparent;
    border-color: var(--dialog-btn-border-color);
    border-radius: var(--dialog-btn-radius);
    transition-property: box-shadow;
    transition-duration: var(--transition-duration-half);
    transition-timing-function: var(--transition-timing-function);
    text-transform: uppercase;
    font-size: var(--font-size-small);
    font-weight: var(--font-weight);
    background: var(--dialog-btn-bg);
    &:last-child {
      color: var(--color-red-500);
    }
    &:hover {
      background: var(--dialog-btn-bg-hover);
      border-color: var(--dialog-btn-border-color-hover);
    }
    &:active {
      background: var(--dialog-btn-bg-active);
      border-color: var(--dialog-btn-border-color-active);
    }
  }
}
</style>
