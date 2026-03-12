import { Player } from '@/domain/enums.ts';
import { PlayerAction } from '@/domain/model/Turn/enums.ts';

export default class ActionTracker {
  private constructor(private readonly actions: Map<Player, PlayerAction>) {}

  static create(players: Array<Player>): ActionTracker {
    const actions = new Map(players.map(player => [player, PlayerAction.Joined]));
    return new ActionTracker(actions);
  }

  record(player: Player, action: PlayerAction): void {
    this.actions.set(player, action);
  }

  hasPlayerPassed(player: Player): boolean {
    return this.actions.get(player) === PlayerAction.PlayedByPass;
  }
}
