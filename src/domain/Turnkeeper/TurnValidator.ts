import { GameContext } from '@/domain/types.ts';
import { Placement } from '@/domain/Turnkeeper/types/shared.ts';
import { Result as ValidationResult } from '@/domain/Turnkeeper/types/local/initialPlacementValidation.ts';
import InitialPlacementValidator from '@/domain/Turnkeeper/validation/InitialPlacementValidator.ts';

export default class TurnValidator {
  static execute(context: GameContext, initialPlacement: Placement): ValidationResult {
    return InitialPlacementValidator.execute(context, { initialPlacement });
  }
}
