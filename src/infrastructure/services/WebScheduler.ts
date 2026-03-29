import { Scheduler } from '@/application/ports.ts';

export default class WebScheduler implements Scheduler {
  yield(): Promise<void> {
    if (typeof scheduler !== 'undefined' && typeof scheduler.yield === 'function') {
      return scheduler.yield();
    }
    return new Promise(resolve => setTimeout(resolve, 0));
  }
}
