<script lang="ts" setup>
import DialogStore, { DialogStatus } from '@/gui/stores/DialogStore.ts';
import { storeToRefs } from 'pinia';
const storeDialog = DialogStore.getInstance();
const { title, html, cancelText, confirmText, cancelIsHidden, confirmIsHidden } = storeToRefs(storeDialog);
const { resolve } = storeDialog;
</script>

<template>
  <Transition name="fade">
    <div v-if="title" class="dialog">
      <Transition tag="div" name="fade-down-up" appear>
        <div
          v-on-click-outside="{ callback: () => resolve({ status: DialogStatus.Dismissed }) }"
          class="dialog__window"
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
  display: grid;
  place-items: center;
  background: rgb(24 24 27 / 0.35);
  &__window {
    padding: var(--space-l) var(--space-xl);
    border-radius: var(--primary-border-radius);
    color: var(--color-gray-fainter);
    background: var(--color-gray-dark);
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
      &:last-child {
        color: var(--color-red);
      }
      text-decoration: underline;
    }
  }
}
</style>
