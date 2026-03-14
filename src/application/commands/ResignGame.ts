import { GameContext } from '@/application/Game.ts';

export default class ResignGame {
  static execute(context: GameContext): void {
    context.turnDirector.resignCurrentTurn();
  }
}
