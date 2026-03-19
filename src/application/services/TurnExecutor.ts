import { Player } from '@/domain/enums.ts';
import TurnValidator from '@/application/services/TurnValidator.ts';
import PassTurnCommand from '@/application/commands/PassTurn.ts';
import SaveTurnCommand from '@/application/commands/SaveTurn.ts';
import type { GameContext } from '@/application/Game.ts';
import TurnGeneratorWorker from '@/infrastructure/TurnGeneratorWorker/TurnGeneratorWorker.ts';
import { TurnOutcome, TurnOutcomeType } from '@/domain/models/TurnTracker.ts';

export type TurnExecutorOutcome = TurnOutcome | { type: TurnOutcomeType.Resign };

export default class TurnExecutor {
  private readonly worker = new TurnGeneratorWorker();

  async execute(context: GameContext, player: Player): Promise<TurnExecutorOutcome> {
    const generatorResult = await this.worker.execute({ context, player });
    if (generatorResult === null) {
      if (context.turnDirector.willPlayerPassBeResign(player)) return { type: TurnOutcomeType.Resign };
      PassTurnCommand.execute(context);
      return { type: TurnOutcomeType.Pass, player };
    }
    for (let i = 0; i < generatorResult.tiles.length; i++) {
      context.turnDirector.placeTile({ cell: generatorResult.cells[i], tile: generatorResult.tiles[i] });
    }
    const validationResult = TurnValidator.execute(context, context.turnDirector.currentTurnTiles);
    context.turnDirector.setCurrentTurnValidation(validationResult);
    const words = context.turnDirector.currentTurnWords ?? [];
    const score = context.turnDirector.currentTurnScore ?? 0;
    SaveTurnCommand.execute(context);
    return { type: TurnOutcomeType.Save, player, words, score };
  }

  terminate(): void {
    this.worker.terminate();
  }
}
