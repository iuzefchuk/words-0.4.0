import { BootProgressPublisher } from '@/application/types/ports.ts';

export default class CallbackBootProgressPublisher implements BootProgressPublisher {
  private handler: ((progress: number) => void) | null = null;

  publish(progress: number): void {
    this.handler?.(progress);
  }

  subscribe(handler: (progress: number) => void): void {
    this.handler = handler;
  }
}
