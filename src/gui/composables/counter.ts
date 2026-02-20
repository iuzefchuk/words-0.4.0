import { ref, onUnmounted } from 'vue';

export function useCounter(intervalMs: number) {
  let interval: Interval | null = null;
  const counter = ref(0);

  function startCounter(callback = () => {}): void {
    stopCounter();
    interval = setInterval(() => {
      counter.value++;
      callback();
    }, intervalMs);
  }

  function restartCounter(callback = () => {}): void {
    counter.value = 0;
    startCounter(callback);
  }

  function stopCounter(): void {
    if (interval) clearInterval(interval);
    interval = null;
  }

  onUnmounted(() => stopCounter());

  return {
    counter,
    startCounter,
    restartCounter,
    stopCounter,
  };
}
