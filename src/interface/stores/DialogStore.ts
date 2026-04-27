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
  cancelText: string;
  confirmText: string;
  html: string;
  title?: string;
};

export default class DialogStore {
  static readonly INSTANCE = defineStore('dialog', () => {
    const store = new DialogStore();
    return {
      cancelText: store.cancelTextRef,
      confirmText: store.confirmTextRef,
      html: store.htmlRef,
      resolve: store.resolve.bind(store),
      title: store.titleRef,
      trigger: store.trigger.bind(store),
    };
  });

  private readonly cancelTextRef = ref<null | string>(null);

  private readonly confirmTextRef = ref<null | string>(null);

  private readonly htmlRef = ref<null | string>(null);

  private pendingResolve: ((result: DialogResult) => void) | null = null;

  private readonly titleRef = ref<null | string>(null);

  private set cancelText(newValue: null | string) {
    this.cancelTextRef.value = newValue;
  }

  private set confirmText(newValue: null | string) {
    this.confirmTextRef.value = newValue;
  }

  private set html(newValue: null | string) {
    this.htmlRef.value = newValue;
  }

  private set title(newValue: null | string) {
    this.titleRef.value = newValue;
  }

  private resetState(): void {
    this.title = null;
    this.html = null;
    this.cancelText = null;
    this.confirmText = null;
  }

  private resolve({ status }: { status: DialogStatus }): void {
    if (this.pendingResolve !== null) {
      this.pendingResolve({
        isCanceled: status === DialogStatus.Canceled,
        isConfirmed: status === DialogStatus.Confirmed,
        isDismissed: status === DialogStatus.Dismissed,
      });
      this.pendingResolve = null;
    }
  }

  private async trigger({ cancelText, confirmText, html, title }: DialogTriggerParams): Promise<DialogResult> {
    this.html = html;
    this.title = title ?? null;
    this.cancelText = cancelText;
    this.confirmText = confirmText;
    const result = await new Promise<DialogResult>(resolve => {
      this.pendingResolve = resolve;
    });
    this.resetState();
    return result;
  }
}
