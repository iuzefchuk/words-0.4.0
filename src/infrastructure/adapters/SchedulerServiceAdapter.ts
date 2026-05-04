import { SchedulerService } from '@/application/types/ports.ts';

export default class SchedulerServiceAdapter {
  static async padTo<T>(minimumMs: number, callback: () => Promise<T> | T): Promise<T> {
    const startTime = SchedulerServiceAdapter.getCurrentTime();
    const result = await callback();
    const elapsed = SchedulerServiceAdapter.getCurrentTime() - startTime;
    const delay = minimumMs - elapsed;
    if (delay > 0) await SchedulerServiceAdapter.wait(delay);
    return result;
  }

  static yield(): Promise<void> {
    if (typeof schedulerService !== 'undefined' && typeof schedulerService.yield === 'function') return schedulerService.yield();
    return new Promise(resolve => {
      queueMicrotask(resolve);
    });
  }

  private static getCurrentTime(): number {
    return Date.now();
  }

  private static wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

SchedulerServiceAdapter satisfies SchedulerService;
