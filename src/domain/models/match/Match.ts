import { Player } from '@/domain/enums.ts';
import { Difficulty, MatchResult, MatchType } from '@/domain/models/match/enums.ts';
import { MatchSettings } from '@/domain/models/match/types.ts';

export default class Match {
  get isFinished(): boolean {
    for (const result of this.results.values()) if (result !== MatchResult.Undecided) return true;
    return false;
  }

  get opponentScore(): number {
    return this.getScoreFor(Player.Opponent);
  }

  get userScore(): number {
    return this.getScoreFor(Player.User);
  }

  private constructor(
    private readonly results: Map<Player, MatchResult>,
    private readonly scores: Map<Player, number>,
    public matchType: MatchType,
    public difficulty: Difficulty,
  ) {}

  static create(players: ReadonlyArray<Player>, settings: MatchSettings): Match {
    const results = new Map(players.map(player => [player, MatchResult.Undecided]));
    const scores = new Map(players.map(player => [player, 0]));
    return new Match(results, scores, settings.matchType, settings.difficulty);
  }

  getResultFor(player: Player): MatchResult {
    const result = this.results.get(player);
    if (result === undefined) throw new ReferenceError(`expected result for player ${player}, got undefined`);
    return result;
  }

  getScoreFor(player: Player): number {
    const score = this.scores.get(player);
    if (score === undefined) throw new ReferenceError(`expected score for player ${player}, got undefined`);
    return score;
  }

  incrementScore(player: Player, incrementation: number): void {
    if (incrementation < 0) throw new Error(`expected non-negative increment, got ${String(incrementation)}`);
    const currentScore = this.getScoreFor(player);
    const newScore = currentScore + incrementation;
    this.scores.set(player, newScore);
  }

  recordCompletion(winner: Player, loser: Player): void {
    this.ensureMutability();
    this.recordResult(winner, MatchResult.Win);
    this.recordResult(loser, MatchResult.Lose);
  }

  recordTie(firstPlayer: Player, secondPlayer: Player): void {
    this.ensureMutability();
    this.recordResult(firstPlayer, MatchResult.Tie);
    this.recordResult(secondPlayer, MatchResult.Tie);
  }

  setDifficulty(difficulty: Difficulty): void {
    this.difficulty = difficulty;
  }

  setMatchType(matchType: MatchType): void {
    this.matchType = matchType;
  }

  private ensureMutability(): void {
    if (this.isFinished) throw new Error('cannot mutate finished match');
  }

  private recordResult(player: Player, result: MatchResult): void {
    this.results.set(player, result);
  }
}
