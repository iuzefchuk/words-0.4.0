import { Clock } from '@/shared/ports.ts';

export default class DateApiClock implements Clock {
  now(): number {
    return Date.now();
  }

  wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
