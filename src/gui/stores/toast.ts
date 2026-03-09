import { ref } from 'vue';
import { defineStore } from 'pinia';
import { wait } from '@/shared/helpers.ts';

type Toast = {
  html: string;
  timestamp?: string;
};

const CONFIG = {
  duration_ms: 2500,
  list_length_max: 10,
};

export const useStoreToast = defineStore('toast', () => {
  const state = {
    toastList: ref<Array<Toast>>([]),
  };

  async function addToast(toast: Toast): Promise<void> {
    toast.timestamp = crypto.randomUUID();
    if (state.toastList.value.length >= CONFIG.list_length_max) state.toastList.value.shift();
    state.toastList.value.push(toast);
    await wait(CONFIG.duration_ms);
    removeToast(toast.timestamp);
  }

  function removeToast(timestamp: string): void {
    state.toastList.value.splice(
      state.toastList.value.findIndex(toast => toast.timestamp === timestamp),
      1,
    );
  }

  return {
    state,
    addToast,
    removeToast,
  };
});
