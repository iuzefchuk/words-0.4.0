import { Domain } from '@/domain/types.ts';

export default class PassTurnCommand {
  static execute(domain: Domain): void {
    domain.passCurrentTurn();
  }
}
