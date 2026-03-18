<script lang="ts" setup>
import ToastStore from '@/gui/stores/ToastStore.ts';
import { storeToRefs } from 'pinia';
const toastStore = ToastStore.getInstance();
const { messages } = storeToRefs(toastStore);
const { removeMessage } = toastStore;
</script>

<template>
  <Transition name="fade">
    <div v-if="messages.length > 0" class="toast">
      <TransitionGroup class="toast__list app__width-content" tag="ul" name="fade-down" appear>
        <li v-for="{ html, id } in messages" :key="id" class="toast__item" @click="removeMessage(id)">
          <p v-html="html" />
        </li>
      </TransitionGroup>
    </div>
  </Transition>
</template>

<style lang="scss" scoped>
.toast {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  display: grid;
  place-items: center;
  z-index: var(--z-index-level-1);
  margin-top: calc(var(--header-height) + var(--space-s));
  pointer-events: none;
  padding-left: var(--primary-padding);
  padding-right: var(--primary-padding);
  &__list {
    pointer-events: all;
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }
  &__item {
    border-radius: var(--primary-border-radius);
    display: grid;
    place-items: center;
    padding: var(--space-m);
    cursor: pointer;
    text-align: center;
    user-select: none;
    color: var(--color-gray-fainter);
    background: var(--color-gray-dark);
    font-weight: var(--font-weight-small);
    line-height: var(--line-height-small);
  }
}
</style>
