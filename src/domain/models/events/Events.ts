import { Player } from '@/domain/enums.ts';
import { EventType } from '@/domain/models/events/enums.ts';
import { Event } from '@/domain/models/events/types.ts';

export default class Events {
  get logView(): ReadonlyArray<Event> {
    return [...this.log];
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
    for (let i = this.log.length - 1; i >= 0; i--) {
      const e = this.log[i]!;
      if (e.type === EventType.TurnPassed && e.player === player) return true;
      if (e.type === EventType.TurnSaved && e.player === player) return false;
    }
    return false;
  }
}
