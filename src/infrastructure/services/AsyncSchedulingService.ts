import { SchedulingService } from '@/application/types/ports.ts';

export default class AsyncSchedulingService implements SchedulingService {
  getCurrentTime(): number {
    return Date.now();
  }

  wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  yield(): Promise<void> {
    if (typeof schedulingService !== 'undefined' && typeof schedulingService.yield === 'function')
      return schedulingService.yield();
    return new Promise(resolve => {
      queueMicrotask(resolve);
    });
  }
}
