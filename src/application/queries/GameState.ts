import { Player } from '@/domain/enums.ts';
import { GameContext, GameState } from '@/application/types.ts';

export default class GameStateQuery {
  static execute(context: GameContext, isMutable: boolean): GameState {
    const { inventory, turnDirector } = context;
    return {
      isFinished: !isMutable,
      tilesRemaining: inventory.unusedTilesCount,
      userTiles: inventory.getTilesFor(Player.User),
      currentTurnScore: turnDirector.currentTurnScore,
      userScore: turnDirector.getScoreFor(Player.User),
      opponentScore: turnDirector.getScoreFor(Player.Opponent),
      currentPlayerIsUser: turnDirector.currentPlayer === Player.User,
      userPassWillBeResign: turnDirector.hasPlayerPassed(Player.User),
    };
  }
}
