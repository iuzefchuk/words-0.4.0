import { GameContext } from '@/domain/types.ts';
import { Placement } from '@/domain/Turnkeeper/types/shared.ts';
import { ValidationResult } from '@/domain/Turnkeeper/types/local/validation.ts';
import InitialPlacementValidator from '@/domain/Turnkeeper/validation/InitialPlacementValidator.ts';

export default class TurnValidator {
  constructor(private readonly context: GameContext) {}

  execute(initialPlacement: Placement): ValidationResult {
    return InitialPlacementValidator.execute({ initialPlacement, gameContext: this.context });
  }
}
