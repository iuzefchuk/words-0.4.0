import { GamePlayer } from '@/domain/enums.ts';
import { Difficulty, Result } from '@/domain/models/match/enums.ts';
import { MatchSettings } from '@/domain/models/match/types.ts';

export default class Match {
  get difficulty(): Difficulty {
    return this._settings.difficulty;
  }

  get isFinished(): boolean {
    for (const result of this.results.values()) if (result !== Result.Undecided) return true;
    return false;
  }

  get opponentScore(): number {
    return this.getScoreFor(GamePlayer.Opponent);
  }

  get settings(): Readonly<MatchSettings> {
    return this._settings;
  }

  get type(): MatchSettings['type'] {
    return this._settings.type;
  }

  get userScore(): number {
    return this.getScoreFor(GamePlayer.User);
  }

  private constructor(
    private readonly results: Map<GamePlayer, Result>,
    private readonly scores: Map<GamePlayer, number>,
    private readonly _settings: MatchSettings,
  ) {}

  static create(players: ReadonlyArray<GamePlayer>, settings: MatchSettings): Match {
    const results = new Map(players.map(player => [player, Result.Undecided]));
    const scores = new Map(players.map(player => [player, 0]));
    return new Match(results, scores, { ...settings });
  }

  applyDifficultyChange(difficulty: Difficulty): void {
    this.ensureMutability();
    this._settings.difficulty = difficulty;
  }

  getResultFor(player: GamePlayer): Result {
    const result = this.results.get(player);
    if (result === undefined) throw new ReferenceError(`expected result for player ${player}, got undefined`);
    return result;
  }

  getScoreFor(player: GamePlayer): number {
    const score = this.scores.get(player);
    if (score === undefined) throw new ReferenceError(`expected score for player ${player}, got undefined`);
    return score;
  }

  incrementScore(player: GamePlayer, incrementation: number): void {
    if (incrementation < 0) throw new Error(`expected non-negative increment, got ${String(incrementation)}`);
    const currentScore = this.getScoreFor(player);
    const newScore = currentScore + incrementation;
    this.scores.set(player, newScore);
  }

  recordCompletion(winner: GamePlayer, loser: GamePlayer): void {
    this.ensureMutability();
    this.recordResult(winner, Result.Win);
    this.recordResult(loser, Result.Lose);
  }

  recordTie(firstPlayer: GamePlayer, secondPlayer: GamePlayer): void {
    this.ensureMutability();
    this.recordResult(firstPlayer, Result.Tie);
    this.recordResult(secondPlayer, Result.Tie);
  }

  private ensureMutability(): void {
    if (this.isFinished) throw new Error('cannot mutate finished match');
  }

  private recordResult(player: GamePlayer, result: Result): void {
    this.results.set(player, result);
  }
}
