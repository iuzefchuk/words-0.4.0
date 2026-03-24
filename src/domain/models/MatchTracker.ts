import { Player } from '@/domain/enums.ts';

export enum MatchResult {
  Win = 'Win',
  Lose = 'Lose',
  Tie = 'Tie',
}

export default class MatchTracker {
  private constructor(private readonly results: Map<Player, MatchResult | undefined>) {}

  static create(players: ReadonlyArray<Player>): MatchTracker {
    const results = new Map(players.map(player => [player, undefined]));
    return new MatchTracker(results);
  }

  get matchIsFinished(): boolean {
    return this.results.values().some(Boolean);
  }

  getResultFor(player: Player): MatchResult | undefined {
    return this.results.get(player);
  }

  recordCompletion(winner: Player, loser: Player): void {
    this.ensureMutability();
    this.record(winner, MatchResult.Win);
    this.record(loser, MatchResult.Lose);
  }

  recordTie(firstPlayer: Player, secondPlayer: Player): void {
    this.ensureMutability();
    this.record(firstPlayer, MatchResult.Tie);
    this.record(secondPlayer, MatchResult.Tie);
  }

  ensureMutability(): void {
    if (this.matchIsFinished) throw new Error('Match is finished');
  }

  private record(player: Player, result: MatchResult): void {
    this.ensureMutability();
    this.results.set(player, result);
  }
}
