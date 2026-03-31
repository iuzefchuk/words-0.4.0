import { onUnmounted, ref } from 'vue';

export default class UseCounter {
  get value(): number {
    return this.valueRef.value;
  }
  private interval: Interval | null = null;

  private readonly valueRef = ref(0);

  private set value(newValue: number) {
    this.valueRef.value = newValue;
  }

  constructor(private readonly intervalMs: number) {
    onUnmounted(() => this.stopCounter());
  }

  restartCounter(callback = () => {}): void {
    this.value = 0;
    this.startCounter(callback);
  }

  stopCounter(): void {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }

  private startCounter(callback = () => {}): void {
    this.stopCounter();
    this.interval = setInterval(() => {
      this.value++;
      callback();
    }, this.intervalMs);
  }
}
