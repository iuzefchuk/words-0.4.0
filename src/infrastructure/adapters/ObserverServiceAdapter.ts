import { ObserverService } from '@/application/types/ports.ts';

// TODO delete Service from name because it is not a service. ObserverServiceAdapter -> ObserverAdapter, ObserverService -> Observer
export default class ObserverServiceAdapter implements ObserverService {
  private callback: ((value: number) => void) | null = null;

  notify(value: number): void {
    this.callback?.(value);
  }

  observe(callback: (value: number) => void): void {
    this.callback = callback;
  }
}
