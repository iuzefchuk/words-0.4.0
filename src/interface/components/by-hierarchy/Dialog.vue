<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import { inject, ref, watch } from 'vue';
import ProvidesPlugin from '@/interface/plugins/ProvidesPlugin.ts';
import DialogStore, { DialogStatus } from '@/interface/stores/DialogStore.ts';
const transitionDurationMs = inject(ProvidesPlugin.TRANSITION_DURATION_MS_KEY);
const dialogStore = DialogStore.INSTANCE();
const { cancelIsHidden, cancelText, confirmIsHidden, confirmText, html, title } = storeToRefs(dialogStore);
const exitAnimation = ref(false);
const isRendered = ref(false);
function respond(status: DialogStatus): void {
  isRendered.value = false;
  dialogStore.resolve({ status });
}
function toggleExitAnimation() {
  exitAnimation.value = true;
  setTimeout(() => {
    exitAnimation.value = false;
  }, transitionDurationMs);
}
watch(html, newValue => {
  if (newValue !== '') isRendered.value = true;
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
          <button v-if="!confirmIsHidden" class="dialog__button" @click="respond(DialogStatus.Confirmed)">
            {{ confirmText }}
          </button>
          <button v-if="!cancelIsHidden" class="dialog__button" @click="respond(DialogStatus.Canceled)">
            {{ cancelText }}
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
  opacity: 0.98;
  &__window {
    padding: var(--space-xl) var(--space-2xl);
    border-radius: var(--primary-border-radius);
    color: var(--dialog-color);
    background: var(--dialog-bg);
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
    border: var(--dialog-btn-border);
    border-radius: var(--primary-border-radius);
    transition-property: box-shadow;
    transition-duration: var(--transition-duration-half);
    transition-timing-function: var(--transition-timing-function);
    text-transform: uppercase;
    font-size: var(--font-size-small);
    font-weight: var(--font-weight);
    &:last-child {
      color: var(--color-red-500);
    }
    &:hover {
      background: var(--dialog-btn-bg-hover);
    }
    &:active {
      background: var(--dialog-btn-bg-active);
    }
  }
}
</style>
