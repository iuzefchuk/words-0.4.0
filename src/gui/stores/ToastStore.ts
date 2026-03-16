import { ref } from 'vue';
import { defineStore } from 'pinia';
import { wait } from '@/shared/helpers.ts';

export type Message = { html: string; timestamp: string };

export default class ToastStore {
  private static readonly timeoutMs = 2500;
  private static readonly maxLimit = 10;

  static readonly getInstance = defineStore('toast', () => {
    const store = new ToastStore();
    return {
      messages: store.messagesRef,
      addMessage: store.addMessage.bind(store),
      removeMessage: store.removeMessage.bind(store),
    };
  });

  private constructor(private messagesRef = ref<Array<Message>>([])) {}

  private get messages(): Array<Message> {
    return this.messagesRef.value;
  }

  private get maxLimitIsReached(): boolean {
    return this.messages.length >= ToastStore.maxLimit;
  }

  private async addMessage(html: string): Promise<void> {
    const message: Message = { html, timestamp: crypto.randomUUID() };
    if (this.maxLimitIsReached) this.messages.shift();
    this.messages.push(message);
    await wait(ToastStore.timeoutMs);
    this.removeMessage(message.timestamp);
  }

  private removeMessage(timestamp: string): void {
    const index = this.messages.findIndex(toast => toast.timestamp === timestamp);
    if (index !== -1) this.messages.splice(index, 1);
  }
}
