<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import { inject, ref, watch } from 'vue';
import ProvidesPlugin from '@/gui/plugins/ProvidesPlugin.ts';
import DialogStore, { DialogStatus } from '@/gui/stores/DialogStore.ts';
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
watch(title, newValue => {
  if (newValue) isRendered.value = true;
});
</script>

<template>
  <Transition name="fade" appear>
    <div v-if="isRendered" class="dialog" @mousedown="toggleExitAnimation">
      <Transition tag="div" name="fade-down-up" appear>
        <div
          v-on-click-outside="{ callback: () => respond(DialogStatus.Dismissed) }"
          :class="{ dialog__window: true, 'dialog__window--shaking': exitAnimation, 'app__width-content': true }"
          @mousedown.stop
        >
          <div class="dialog__content">
            <p class="dialog__content-title">{{ title }}</p>
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
        </div>
      </Transition>
    </div>
  </Transition>
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
  background: rgb(24 24 27 / 0.35);
  opacity: 0.95;
  &__window {
    padding: var(--space-l) var(--space-xl);
    border-radius: var(--primary-border-radius);
    color: var(--dialog-color);
    background: var(--dialog-bg);
    width: max-content;
    min-width: 24rem;
    margin-top: 17rem;
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
    justify-content: flex-end;
    gap: var(--space-m);
    padding-top: var(--space-xl);
    padding-bottom: var(--space-xs);
  }
  &__button {
    cursor: pointer;
    padding: var(--space-s);
    border: var(--dialog-button-border);
    border-radius: var(--primary-border-radius);
    transition-property: box-shadow;
    transition-duration: var(--transition-duration-half);
    transition-timing-function: var(--transition-timing-function);
    &:last-child {
      color: var(--color-red);
    }
    &:hover {
      background: var(--dialog-button-bg-hover);
    }
    &:active {
      background: var(--dialog-button-bg-active);
    }
  }
}
</style>
