import { EventType, Player } from '@/domain/enums.ts';
import { GameEvent } from '@/domain/types/index.ts';

// TODO to models ?
export default class Events {
  get logView(): ReadonlyArray<GameEvent> {
    return [...this.log];
  }

  private constructor(
    private readonly log: Array<GameEvent>,
    private readonly pending: Array<GameEvent>,
  ) {}

  static create(initialEvents: Array<GameEvent> = []): Events {
    return new Events([...initialEvents], []);
  }

  drainPending(): Array<GameEvent> {
    const drained = [...this.pending];
    this.pending.length = 0;
    return drained;
  }

  record(event: GameEvent): void {
    this.log.push(event);
    this.pending.push(event);
  }

  reset(initialEvent: GameEvent): void {
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
