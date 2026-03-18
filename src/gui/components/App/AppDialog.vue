<script lang="ts" setup>
import DialogStore, { DialogStatus } from '@/gui/stores/DialogStore.ts';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
const dialogStore = DialogStore.INSTANCE();
const { title, html, cancelText, confirmText, cancelIsHidden, confirmIsHidden } = storeToRefs(dialogStore);
const { resolve } = dialogStore;
const exitAnimation = ref(false);
function toggleExitAnimation() {
  exitAnimation.value = true;
  setTimeout(() => {
    exitAnimation.value = false;
  }, 300);
}
</script>

<template>
  <Transition name="fade">
    <div v-if="title" class="dialog" @mousedown="toggleExitAnimation">
      <Transition tag="div" name="fade-down-up" appear>
        <div
          v-on-click-outside="{ callback: () => resolve({ status: DialogStatus.Dismissed }) }"
          :class="{ dialog__window: true, 'dialog__window--shaking': exitAnimation, 'app__width-content': true }"
          @mousedown.stop
        >
          <div class="dialog__content">
            <p class="dialog__content-title">{{ title }}</p>
            <p v-html="html" />
          </div>
          <div class="dialog__footer">
            <button v-if="!cancelIsHidden" @click="resolve({ status: DialogStatus.Canceled })">
              {{ cancelText }}
            </button>
            <button v-if="!confirmIsHidden" @click="resolve({ status: DialogStatus.Confirmed })">
              {{ confirmText }}
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
  display: flex;
  flex-direction: column;
  align-items: center;
   background: rgb(24 24 27 / 0.35);
  &__window {
    padding: var(--space-l) var(--space-xl);
    border-radius: var(--primary-border-radius);
    color: var(--color-gray-fainter);
    background: var(--color-gray-darker);
    margin-top: calc(var(--header-height) + var(--space-s));
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
    button {
      cursor: pointer;
      border-bottom: 1px solid var(--color-gray-faintest);
      &:last-child {
        color: var(--color-red);
      }
      padding: var(--space-4xs) 0;
    }
  }
}
</style>
