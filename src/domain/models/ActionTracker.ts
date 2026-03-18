import { Player } from '@/domain/enums.ts';

export enum ActionType {
  Save = 'Save',
  Pass = 'Pass',
  Won = 'Won',
  Lost = 'Lost',
  Tied = 'Tied',
}

export type Action =
  | { type: ActionType.Save; player: Player; words: ReadonlyArray<string>; points: number }
  | { type: ActionType.Pass; player: Player }
  | { type: ActionType.Won; player: Player }
  | { type: ActionType.Lost; player: Player }
  | { type: ActionType.Tied; player: Player };

export default class ActionTracker {
  private readonly _log: Array<Action> = [];

  get log(): ReadonlyArray<Action> {
    return [...this._log];
  }

  record(action: Action): void {
    this._log.push(action);
  }

  willPlayerPassBeResign(player: Player): boolean {
    return this.getLastAction(player)?.type === ActionType.Pass;
  }

  getLastAction(player: Player): Action | undefined {
    for (let i = this._log.length - 1; i >= 0; i--) {
      if (this._log[i].player === player) return this._log[i];
    }
    return undefined;
  }
}
