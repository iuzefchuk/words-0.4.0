import { ref } from 'vue';
import { defineStore } from 'pinia';
import { setPromise } from '@/gui/helpers.js';

export enum DialogStatus {
  None = 'None',
  Dismissed = 'Dismissed',
  Canceled = 'Canceled',
  Confirmed = 'Confirmed',
}

export const useStoreDialog = defineStore('dialog', () => {
  const state = {
    status: ref(''),
    title: ref(''),
    html: ref(''),
    cancelText: ref(''),
    confirmText: ref(''),
    cancelIsHidden: ref(false),
    confirmIsHidden: ref(false),
  };

  function setDefaultStatus(): void {
    state.status.value = DialogStatus.None;
    state.title.value = '';
    state.html.value = '';
    state.cancelText.value = window.t('general.cancel');
    state.confirmText.value = window.t('general.ok');
    state.cancelIsHidden.value = false;
    state.confirmIsHidden.value = false;
  }

  async function triggerDialog({
    title,
    html,
    cancelText,
    confirmText,
    cancelIsHidden,
    confirmIsHidden,
  }: {
    title: string;
    html: string;
    cancelText?: string;
    confirmText?: string;
    cancelIsHidden?: boolean;
    confirmIsHidden?: boolean;
  }): Promise<{ isDismissed: boolean; isCanceled: boolean; isConfirmed: boolean }> {
    state.title.value = title;
    state.html.value = html;
    if (cancelText) state.cancelText.value = cancelText;
    if (confirmText) state.confirmText.value = confirmText;
    if (cancelIsHidden) state.cancelIsHidden.value = cancelIsHidden;
    if (confirmIsHidden) state.confirmIsHidden.value = confirmIsHidden;
    await setPromise(() => state.status.value !== DialogStatus.None);
    const result = {
      isDismissed: state.status.value === DialogStatus.Dismissed,
      isConfirmed: state.status.value === DialogStatus.Confirmed,
      isCanceled: state.status.value === DialogStatus.Canceled,
    };
    setDefaultStatus();
    return result;
  }

  function setDialogStatus(status: DialogStatus): void {
    state.status.value = status;
  }

  setDefaultStatus();

  return {
    state,
    setDefaultStatus,
    triggerDialog,
    setDialogStatus,
  };
});
