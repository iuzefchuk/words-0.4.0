import { ObserverService } from '@/application/types/ports.ts';

export default class ObserverServiceAdapter implements ObserverService {
  private callback: ((value: number) => void) | null = null;

  notify(value: number): void {
    this.callback?.(value);
  }

  observe(callback: (value: number) => void): void {
    this.callback = callback;
  }
}
