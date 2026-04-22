import { Player } from '@/domain/enums.ts';
import { EventType } from '@/domain/models/events/enums.ts';
import { Event } from '@/domain/models/events/types.ts';

export default class Events {
  get logView(): ReadonlyArray<Event> {
    return this.log;
  }

  private constructor(
    private readonly log: Array<Event>,
    private readonly pending: Array<Event>,
  ) {}

  static create(initialEvents: Array<Event> = []): Events {
    return new Events([...initialEvents], []);
  }

  drainPending(): Array<Event> {
    const drained = [...this.pending];
    this.pending.length = 0;
    return drained;
  }

  record(event: Event): void {
    this.log.push(event);
    this.pending.push(event);
  }

  reset(initialEvent: Event): void {
    this.log.length = 0;
    this.log.push(initialEvent);
  }

  wasLastTurnEventPassFor(player: Player): boolean {
    for (let idx = this.log.length - 1; idx >= 0; idx--) {
      const event = this.log[idx];
      if (event === undefined) throw new ReferenceError(`expected event at index ${String(idx)}, got undefined`);
      if (event.type === EventType.TurnPassed && event.player === player) return true;
      if (event.type === EventType.TurnSaved && event.player === player) return false;
    }
    return false;
  }
}
