import { ref } from 'vue';
import { defineStore } from 'pinia';

export enum DialogStatus {
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
  static readonly INSTANCE = defineStore('dialog', () => {
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

  private static readonly DEFAULT_TITLE = '';
  private static readonly DEFAULT_HTML = '';
  private static readonly DEFAULT_CANCEL_TEXT = 'general.cancel';
  private static readonly DEFAULT_CONFIRM_TEXT = 'general.ok';
  private static readonly DEFAULT_CANCEL_IS_HIDDEN = false;
  private static readonly DEFAULT_CONFIRM_IS_HIDDEN = false;

  private pendingResolve: ((result: DialogResult) => void) | null = null;
  private titleRef = ref(DialogStore.DEFAULT_TITLE);
  private htmlRef = ref(DialogStore.DEFAULT_HTML);
  private cancelTextRef = ref(DialogStore.DEFAULT_CANCEL_TEXT);
  private confirmTextRef = ref(DialogStore.DEFAULT_CONFIRM_TEXT);
  private cancelIsHiddenRef = ref(DialogStore.DEFAULT_CANCEL_IS_HIDDEN);
  private confirmIsHiddenRef = ref(DialogStore.DEFAULT_CONFIRM_IS_HIDDEN);

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
    const result = await new Promise<DialogResult>(resolve => {
      this.pendingResolve = resolve;
    });
    this.resetState();
    return result;
  }

  private resolve({ status }: { status: DialogStatus }): void {
    if (this.pendingResolve) {
      this.pendingResolve({
        isDismissed: status === DialogStatus.Dismissed,
        isConfirmed: status === DialogStatus.Confirmed,
        isCanceled: status === DialogStatus.Canceled,
      });
      this.pendingResolve = null;
    }
  }

  private resetState() {
    this.title = DialogStore.DEFAULT_TITLE;
    this.html = DialogStore.DEFAULT_HTML;
    this.cancelText = DialogStore.DEFAULT_CANCEL_TEXT;
    this.confirmText = DialogStore.DEFAULT_CONFIRM_TEXT;
    this.cancelIsHidden = DialogStore.DEFAULT_CANCEL_IS_HIDDEN;
    this.confirmIsHidden = DialogStore.DEFAULT_CONFIRM_IS_HIDDEN;
  }
}
