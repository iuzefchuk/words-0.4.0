import { Player } from '@/domain/enums.js';
import { GameContext } from '@/domain/types.ts';
import { Placement } from '@/domain/Turnkeeper/types/shared.ts';
import InitialPlacementGenerator from '@/domain/Turnkeeper/generation/InitialPlacementGenerator.js';

export default class TurnGenerator {
  private readonly initialPlacementGenerator: InitialPlacementGenerator;

  constructor(context: GameContext) {
    this.initialPlacementGenerator = new InitialPlacementGenerator(context);
  }

  *execute(player: Player): Generator<Placement> {
    yield* this.initialPlacementGenerator.execute(player);
  }
}
