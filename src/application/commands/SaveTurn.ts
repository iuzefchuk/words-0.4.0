import { Domain, DomainTurnResult } from '@/domain/types.ts';

export default class SaveTurnCommand {
  static execute(domain: Domain): DomainTurnResult {
    if (domain.currentTurnError) return { ok: false, error: domain.currentTurnError };
    const { words } = domain.saveCurrentTurn();
    return { ok: true, value: { words } };
  }
}
