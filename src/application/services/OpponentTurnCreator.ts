import { Player } from '@/domain/enums.ts';
import TurnValidator from '@/application/services/TurnValidator.ts';
import PassTurnCommand from '@/application/commands/PassTurn.ts';
import SaveTurnCommand from '@/application/commands/SaveTurn.ts';
import { GameContext, GameTurnResult } from '@/application/types.ts';
import TurnGeneratorWorker from '@/infrastructure/TurnGeneratorWorker/index.ts';
import { TurnOutcomeType } from '@/domain/models/TurnTracker.ts';

export type OpponentTurnOutcome =
  | { type: TurnOutcomeType.Resign }
  | { type: TurnOutcomeType.Pass }
  | { type: TurnOutcomeType.Save; result: GameTurnResult };

export default class OpponentTurnCreator {
  static async execute(context: GameContext, worker: TurnGeneratorWorker): Promise<OpponentTurnOutcome> {
    const generatorResult = await worker.execute({ context, player: Player.Opponent });
    if (generatorResult === null) {
      if (context.turnDirector.willPlayerPassBeResign(Player.User)) return { type: TurnOutcomeType.Resign };
      PassTurnCommand.execute(context);
      return { type: TurnOutcomeType.Pass };
    }
    for (let i = 0; i < generatorResult.tiles.length; i++) {
      context.turnDirector.placeTile({ cell: generatorResult.cells[i], tile: generatorResult.tiles[i] });
    }
    const validationResult = TurnValidator.execute(context, context.turnDirector.currentTurnTiles);
    context.turnDirector.setCurrentTurnValidation(validationResult);
    const result = SaveTurnCommand.execute(context);
    return { type: TurnOutcomeType.Save, result };
  }
}
