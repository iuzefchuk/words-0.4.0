import { Clock, Scheduler } from '@/application/ports.ts';
import {
  AppCommands,
  AppTurnResponse,
  GameBonusDistribution,
  GameCell,
  GameDifficulty,
  GameEvent,
  GameEventType,
  GameGeneratorResult,
  GameInventoryView,
  GamePlayer,
  GameTile,
  GameTurnGenerator,
} from '@/application/types.ts';
import Game from '@/domain/index.ts';
import type { GameRepository } from '@/domain/ports.ts';
import { TIME } from '@/shared/constants.ts';

export default class AppCommandBuilder {
  private static readonly OPPONENT_RESPONSE_MIN_TIME = TIME.ms_in_second * 2;
  private static readonly DIFFICULTY_RESULT_LIMITS: Record<GameDifficulty, number> = {
    [GameDifficulty.Low]: 1,
    [GameDifficulty.Medium]: 20,
    [GameDifficulty.High]: Infinity,
  };
  private eventCursor: number;

  constructor(
    private readonly game: Game,
    private readonly clock: Clock,
    private readonly scheduler: Scheduler,
    private readonly gameRepository: GameRepository,
  ) {
    this.eventCursor = game.eventLog.length;
  }

  get commands(): AppCommands {
    return {
      changeBonusDistribution: (bonusDistribution: GameBonusDistribution) =>
        this.changeBonusDistribution(bonusDistribution),
      changeDifficulty: (difficulty: GameDifficulty) => this.changeDifficulty(difficulty),
      placeTile: (args: { cell: GameCell; tile: GameTile }) => this.placeTile(args),
      undoPlaceTile: (tile: GameTile) => this.undoPlaceTile(tile),
      clearTiles: () => {
        this.game.clearTiles();
        this.syncPersistence();
      },
      handleSaveTurn: () => this.handleSaveTurn(),
      handlePassTurn: () => this.handlePassTurn(),
      handleResignMatch: () => {
        this.game.resignMatch();
        this.clearPersistence();
      },
      clearAllEvents: () => this.drainNewEvents(),
    };
  }

  private get inventoryView(): Readonly<GameInventoryView> {
    return this.game.inventoryView;
  }

  private get currentPlayer(): GamePlayer {
    return this.game.turnsView.currentPlayer;
  }

  private syncPersistence(): void {
    this.gameRepository.save(this.game.snapshot);
  }

  private clearPersistence(): void {
    this.gameRepository.delete();
  }

  private changeBonusDistribution(bonusDistribution: GameBonusDistribution): void {
    this.game.changeBonusDistribution(bonusDistribution);
  }

  private changeDifficulty(difficulty: GameDifficulty): void {
    this.game.changeDifficulty(difficulty);
  }

  private placeTile({ cell, tile }: { cell: GameCell; tile: GameTile }): void {
    this.game.placeTile({ cell, tile });
    this.game.validateTurn();
    this.syncPersistence();
  }

  private undoPlaceTile(tile: GameTile): void {
    this.game.undoPlaceTile({ tile });
    this.game.validateTurn();
    this.syncPersistence();
  }

  private handleSaveTurn(): { userResponse: AppTurnResponse; opponentTurn?: Promise<AppTurnResponse> } {
    const player = this.currentPlayer;
    const userResponse = this.saveTurn();
    if (!userResponse.ok) {
      return { userResponse };
    }
    if (!this.inventoryView.hasTilesFor(player)) {
      this.game.finishMatchByScore();
      this.clearPersistence();
      return { userResponse };
    }
    if (this.game.matchView.isFinished) {
      this.clearPersistence();
      return { userResponse };
    }
    this.syncPersistence();
    const opponentTurn = this.currentPlayer === GamePlayer.Opponent ? this.executeOpponentTurn() : undefined;
    return { userResponse, opponentTurn };
  }

  private handlePassTurn(): { opponentTurn?: Promise<AppTurnResponse> } {
    if (this.game.willPassBeResignFor(GamePlayer.User)) {
      this.game.resignMatch();
      this.clearPersistence();
      return {};
    }
    this.game.passTurn();
    this.syncPersistence();
    const opponentTurn = this.currentPlayer === GamePlayer.Opponent ? this.executeOpponentTurn() : undefined;
    return { opponentTurn };
  }

  private saveTurn(): AppTurnResponse {
    if (!this.game.turnsView.currentTurnIsValid) return { ok: false, error: 'Turn is not valid' };
    const { words } = this.game.saveTurn();
    return { ok: true, value: { words } };
  }

  private async executeOpponentTurn(): Promise<AppTurnResponse> {
    const event = await this.ensureMinimumDuration(() => this.createOpponentTurn());
    let response: AppTurnResponse;
    switch (event.type) {
      case GameEventType.MatchLost:
        response = { ok: true, value: { words: [] } };
        break;
      case GameEventType.OpponentTurnPassed:
        response = { ok: true, value: { words: [] } };
        break;
      case GameEventType.OpponentTurnSaved:
        if (!this.inventoryView.hasTilesFor(GamePlayer.Opponent)) this.game.finishMatchByScore();
        response = { ok: true, value: { words: event.words } };
        break;
      default:
        throw new Error(`Unexpected event type: ${(event as { type: string }).type}`);
    }
    if (this.game.matchView.isFinished) {
      this.clearPersistence();
    } else {
      this.syncPersistence();
    }
    return response;
  }

  private async createOpponentTurn(): Promise<GameEvent> {
    const player = GamePlayer.Opponent;
    const { difficulty } = this.game;
    const attemptsLimit = AppCommandBuilder.DIFFICULTY_RESULT_LIMITS[difficulty];
    const context = this.game.createGeneratorContext();
    let bestResult: GameGeneratorResult | null = null;
    let bestScore = -1;
    let attemptsCount = 0;
    for await (const result of GameTurnGenerator.execute(context, player, () => this.scheduler.yield())) {
      if (attemptsLimit === 1) {
        bestResult = result;
        break;
      }
      if (result.validationResult.score > bestScore) {
        bestResult = result;
        bestScore = result.validationResult.score;
      }
      if (++attemptsCount >= attemptsLimit) break;
    }
    if (bestResult === null) {
      if (this.game.willPassBeResignFor(player)) {
        this.game.resignMatch();
        return { type: GameEventType.MatchLost };
      }
      this.game.passTurn();
      return { type: GameEventType.OpponentTurnPassed };
    }
    const { words, score } = this.game.applyGeneratedTurn(bestResult);
    return { type: GameEventType.OpponentTurnSaved, words, score };
  }

  private drainNewEvents(): Array<GameEvent> {
    const log = this.game.eventLog as Array<GameEvent>;
    const newEvents = log.slice(this.eventCursor);
    this.eventCursor = log.length;
    return newEvents;
  }

  private async ensureMinimumDuration<T>(callback: () => Promise<T> | T): Promise<T> {
    const startTime = this.clock.now();
    const result = await callback();
    const elapsed = this.clock.now() - startTime;
    const delay = AppCommandBuilder.OPPONENT_RESPONSE_MIN_TIME - elapsed;
    if (delay > 0) await this.clock.wait(delay);
    return result;
  }
}
