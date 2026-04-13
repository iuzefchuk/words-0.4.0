import { defineStore } from 'pinia';
import { ref } from 'vue';

export enum DialogStatus {
  Canceled = 'Canceled',
  Confirmed = 'Confirmed',
  Dismissed = 'Dismissed',
}

type DialogResult = {
  isCanceled: boolean;
  isConfirmed: boolean;
  isDismissed: boolean;
};

type DialogTriggerParams = {
  cancelIsHidden?: boolean;
  cancelText?: string;
  confirmIsHidden?: boolean;
  confirmText?: string;
  html: string;
  title?: string;
};

export default class DialogStore {
  static readonly INSTANCE = defineStore('dialog', () => {
    const store = new DialogStore();
    return {
      cancelIsHidden: store.cancelIsHiddenRef,
      cancelText: store.cancelTextRef,
      confirmIsHidden: store.confirmIsHiddenRef,
      confirmText: store.confirmTextRef,
      html: store.htmlRef,
      resolve: store.resolve.bind(store),
      title: store.titleRef,
      trigger: store.trigger.bind(store),
    };
  });

  private static readonly DEFAULT_CANCEL_IS_HIDDEN = false;

  private static readonly DEFAULT_CANCEL_TEXT = '';

  private static readonly DEFAULT_CONFIRM_IS_HIDDEN = false;

  private static readonly DEFAULT_CONFIRM_TEXT = '';

  private static readonly DEFAULT_HTML = '';

  private static readonly DEFAULT_TITLE = '';

  private cancelIsHiddenRef = ref(DialogStore.DEFAULT_CANCEL_IS_HIDDEN);

  private cancelTextRef = ref(DialogStore.DEFAULT_CANCEL_TEXT);

  private confirmIsHiddenRef = ref(DialogStore.DEFAULT_CONFIRM_IS_HIDDEN);

  private confirmTextRef = ref(DialogStore.DEFAULT_CONFIRM_TEXT);

  private htmlRef = ref(DialogStore.DEFAULT_HTML);

  private pendingResolve: ((result: DialogResult) => void) | null = null;

  private titleRef = ref(DialogStore.DEFAULT_TITLE);

  private set cancelIsHidden(newValue: boolean) {
    this.cancelIsHiddenRef.value = newValue;
  }

  private set cancelText(newValue: string) {
    this.cancelTextRef.value = newValue;
  }

  private set confirmIsHidden(newValue: boolean) {
    this.confirmIsHiddenRef.value = newValue;
  }

  private set confirmText(newValue: string) {
    this.confirmTextRef.value = newValue;
  }

  private set html(newValue: string) {
    this.htmlRef.value = newValue;
  }

  private set title(newValue: string) {
    this.titleRef.value = newValue;
  }

  private resetState() {
    this.title = DialogStore.DEFAULT_TITLE;
    this.html = DialogStore.DEFAULT_HTML;
    this.cancelText = DialogStore.DEFAULT_CANCEL_TEXT;
    this.confirmText = DialogStore.DEFAULT_CONFIRM_TEXT;
    this.cancelIsHidden = DialogStore.DEFAULT_CANCEL_IS_HIDDEN;
    this.confirmIsHidden = DialogStore.DEFAULT_CONFIRM_IS_HIDDEN;
  }

  private resolve({ status }: { status: DialogStatus }): void {
    if (this.pendingResolve) {
      this.pendingResolve({
        isCanceled: status === DialogStatus.Canceled,
        isConfirmed: status === DialogStatus.Confirmed,
        isDismissed: status === DialogStatus.Dismissed,
      });
      this.pendingResolve = null;
    }
  }

  private async trigger({ cancelIsHidden, cancelText, confirmIsHidden, confirmText, html, title }: DialogTriggerParams): Promise<DialogResult> {
    this.html = html;
    if (title) this.title = title;
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
}
