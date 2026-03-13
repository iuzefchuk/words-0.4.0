import { ref } from 'vue';
import { defineStore } from 'pinia';
import { setPromise } from '@/shared/helpers.ts';

export enum DialogStatus {
  None = 'None',
  Dismissed = 'Dismissed',
  Canceled = 'Canceled',
  Confirmed = 'Confirmed',
}

export type DialogTriggerParams = {
  title: string;
  html: string;
  cancelText?: string;
  confirmText?: string;
  cancelIsHidden?: boolean;
  confirmIsHidden?: boolean;
};

export type DialogResult = {
  isDismissed: boolean;
  isCanceled: boolean;
  isConfirmed: boolean;
};

export default class DialogStore {
  static readonly getInstance = defineStore('dialog', () => {
    const store = new DialogStore();
    return {
      title: store.titleRef,
      html: store.htmlRef,
      cancelText: store.cancelTextRef,
      confirmText: store.confirmTextRef,
      cancelIsHidden: store.cancelIsHiddenRef,
      confirmIsHidden: store.confirmIsHiddenRef,
      trigger: store.trigger.bind(store),
      resolve: store.resolve.bind(store),
    };
  });

  private static readonly defaultStatus = DialogStatus.None;
  private static readonly defaultTitle = '';
  private static readonly defaultHtml = '';
  private static readonly defaultCancelText = 'general.cancel';
  private static readonly defaultConfirmText = 'general.ok';
  private static readonly defaultCancelIsHidden = false;
  private static readonly defaultConfirmIsHidden = false;

  private statusRef = ref(DialogStore.defaultStatus);
  private titleRef = ref(DialogStore.defaultTitle);
  private htmlRef = ref(DialogStore.defaultHtml);
  private cancelTextRef = ref(DialogStore.defaultCancelText);
  private confirmTextRef = ref(DialogStore.defaultConfirmText);
  private cancelIsHiddenRef = ref(DialogStore.defaultCancelIsHidden);
  private confirmIsHiddenRef = ref(DialogStore.defaultConfirmIsHidden);

  private get status(): DialogStatus {
    return this.statusRef.value;
  }

  private set status(newValue: DialogStatus) {
    this.statusRef.value = newValue;
  }

  private set title(newValue: string) {
    this.titleRef.value = newValue;
  }

  private set html(newValue: string) {
    this.htmlRef.value = newValue;
  }

  private set cancelText(newValue: string) {
    this.cancelTextRef.value = newValue;
  }

  private set confirmText(newValue: string) {
    this.confirmTextRef.value = newValue;
  }

  private set cancelIsHidden(newValue: boolean) {
    this.cancelIsHiddenRef.value = newValue;
  }

  private set confirmIsHidden(newValue: boolean) {
    this.confirmIsHiddenRef.value = newValue;
  }

  private get result(): DialogResult {
    return {
      isDismissed: this.status === DialogStatus.Dismissed,
      isConfirmed: this.status === DialogStatus.Confirmed,
      isCanceled: this.status === DialogStatus.Canceled,
    };
  }

  private async trigger({
    title,
    html,
    cancelText,
    confirmText,
    cancelIsHidden,
    confirmIsHidden,
  }: DialogTriggerParams): Promise<DialogResult> {
    this.title = title;
    this.html = html;
    if (cancelText) this.cancelText = cancelText;
    if (confirmText) this.confirmText = confirmText;
    if (cancelIsHidden !== undefined) this.cancelIsHidden = cancelIsHidden;
    if (confirmIsHidden !== undefined) this.confirmIsHidden = confirmIsHidden;
    await setPromise(() => this.status !== DialogStatus.None);
    const result = Object.assign({}, this.result);
    this.resetState();
    return result;
  }

  private resolve({ status }: { status: DialogStatus }): void {
    this.status = status;
  }

  private resetState() {
    this.status = DialogStore.defaultStatus;
    this.title = DialogStore.defaultTitle;
    this.html = DialogStore.defaultHtml;
    this.cancelText = DialogStore.defaultCancelText;
    this.confirmText = DialogStore.defaultConfirmText;
    this.cancelIsHidden = DialogStore.defaultCancelIsHidden;
    this.confirmIsHidden = DialogStore.defaultConfirmIsHidden;
  }
}
