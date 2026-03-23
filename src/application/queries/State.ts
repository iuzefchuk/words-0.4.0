import { Domain, DomainPlayer } from '@/domain/types.ts';
import { MatchResult } from '@/application/enums.ts';
import { AppState } from '@/application/types.ts';

export default class StateQuery {
  static execute(domain: Domain, isMutable: boolean, userMatchResult?: MatchResult): AppState {
    return {
      isFinished: !isMutable,
      matchResult: userMatchResult,
      tilesRemaining: domain.unusedTilesCount,
      userTiles: domain.getTilesFor(DomainPlayer.User),
      currentTurnScore: domain.currentTurnScore,
      userScore: domain.getScoreFor(DomainPlayer.User),
      opponentScore: domain.getScoreFor(DomainPlayer.Opponent),
      currentTurnIsValid: domain.currentTurnIsValid,
      currentPlayerIsUser: domain.currentPlayer === DomainPlayer.User,
      userPassWillBeResign: domain.willPlayerPassBeResign(DomainPlayer.User),
    };
  }
}
