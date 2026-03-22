import { Player } from '@/domain/enums.ts';
import { GameContext, GameResultType, GameState } from '@/application/Game.ts';

export default class GameStateQuery {
  static execute(context: GameContext, isMutable: boolean, gameResult?: GameResultType): GameState {
    const { inventory, turnDirector } = context;
    return {
      isFinished: !isMutable,
      gameResult,
      tilesRemaining: inventory.unusedTilesCount,
      userTiles: inventory.getTilesFor(Player.User),
      currentTurnScore: turnDirector.currentTurnScore,
      userScore: turnDirector.getScoreFor(Player.User),
      opponentScore: turnDirector.getScoreFor(Player.Opponent),
      currentTurnIsValid: turnDirector.currentTurnIsValid,
      currentPlayerIsUser: turnDirector.currentPlayer === Player.User,
      userPassWillBeResign: turnDirector.willPlayerPassBeResign(Player.User),
    };
  }
}
