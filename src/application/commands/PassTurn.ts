import { GameContext } from '@/application/Game.ts';

export default class PassTurn {
  static execute(context: GameContext): void {
    context.turnDirector.passCurrentTurn();
  }
}
