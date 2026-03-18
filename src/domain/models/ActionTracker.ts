import { Player } from '@/domain/enums.ts';

export enum PlayerAction {
  Joined = 'Joined',
  Saved = 'Saved',
  Passed = 'Passed',
  Won = 'Won',
  Lost = 'Lost',
  Tied = 'Tied',
}

export default class ActionTracker {
  private constructor(private readonly lastActions: Map<Player, PlayerAction>) {}

  static create(players: ReadonlyArray<Player>): ActionTracker {
    const actions = new Map(players.map(player => [player, PlayerAction.Joined]));
    return new ActionTracker(actions);
  }

  record(player: Player, action: PlayerAction): void {
    this.lastActions.set(player, action);
  }

  hasPlayerPassed(player: Player): boolean {
    return this.lastActions.get(player) === PlayerAction.Passed;
  }
}
