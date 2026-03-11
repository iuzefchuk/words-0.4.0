import { Player } from '@/domain/enums.ts';
import { GameContext } from '@/domain/types.ts';
import { Placement } from '@/domain/Turnkeeper/types/shared.ts';
import InitialPlacementGenerator from '@/domain/Turnkeeper/generation/InitialPlacementGenerator.ts';

export default class TurnGenerator {
  static *execute(context: GameContext, player: Player): Generator<Placement> {
    yield* InitialPlacementGenerator.execute(context, { player });
  }
}
