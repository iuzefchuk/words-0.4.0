import {
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
  SchedulingService,
} from '@/application/types.ts';
import Game from '@/domain/Game.ts';
import { TIME } from '@/shared/constants.ts';
import type { EventRepository, IdentityService } from '@/domain/types.ts';

export default class CommandsService {
  private static readonly DIFFICULTY_RESULT_LIMITS: Record<GameDifficulty, number> = {
    [GameDifficulty.High]: Infinity,
    [GameDifficulty.Low]: 1,
    [GameDifficulty.Medium]: 20,
  };

  private static readonly OPPONENT_RESPONSE_MIN_TIME = TIME.ms_in_second * 2;

  private get currentPlayer(): GamePlayer {
    return this.game.turnsView.currentPlayer;
  }

  private get inventoryView(): Readonly<GameInventoryView> {
    return this.game.inventoryView;
  }

  constructor(
    private readonly game: Game,
    private readonly identityService: IdentityService,
    private readonly schedulingService: SchedulingService,
    private readonly eventRepository: EventRepository,
  ) {}

  changeBoardType(boardType: GameBonusDistribution): void {
    this.game.changeBoardType(boardType);
  }

  changeDifficulty(difficulty: GameDifficulty): void {
    this.game.changeDifficulty(difficulty);
  }

  clearTiles(): void {
    this.game.clearTiles();
    this.syncPersistence();
  }

  drainNewEvents(): Array<GameEvent> {
    return this.game.drainPendingEvents();
  }

  handlePassTurn(): { opponentTurn: Promise<AppTurnResponse> | undefined } {
    this.clearTiles();
    if (this.game.willPassBeResignFor(GamePlayer.User)) {
      this.game.resignMatchForCurrentPlayer();
      this.clearPersistence();
      return { opponentTurn: undefined };
    }
    this.game.passTurnForCurrentPlayer();
    this.syncPersistence();
    const opponentTurn = this.currentPlayer === GamePlayer.Opponent ? this.executeOpponentTurn() : undefined;
    return { opponentTurn };
  }

  handleResignMatch(): void {
    this.clearTiles();
    this.game.resignMatchForCurrentPlayer();
    this.clearPersistence();
  }

  handleSaveTurn(): { opponentTurn: Promise<AppTurnResponse> | undefined; userResponse: AppTurnResponse } {
    const player = this.currentPlayer;
    const userResponse = this.saveTurnForCurrentPlayer();
    if (!userResponse.ok) {
      return { opponentTurn: undefined, userResponse };
    }
    if (!this.inventoryView.hasTilesFor(player)) {
      this.game.finishMatchByScore();
      this.clearPersistence();
      return { opponentTurn: undefined, userResponse };
    }
    if (this.game.matchView.isFinished) {
      this.clearPersistence();
      return { opponentTurn: undefined, userResponse };
    }
    this.syncPersistence();
    const opponentTurn = this.currentPlayer === GamePlayer.Opponent ? this.executeOpponentTurn() : undefined;
    return { opponentTurn, userResponse };
  }

  placeTile({ cell, tile }: { cell: GameCell; tile: GameTile }): void {
    this.game.placeTile({ cell, tile });
    this.game.validateTurn();
    this.syncPersistence();
  }

  restartGame(): void {
    this.game.restart();
    this.clearPersistence();
  }

  undoPlaceTile(tile: GameTile): void {
    this.game.undoPlaceTile({ tile });
    this.game.validateTurn();
    this.syncPersistence();
  }

  private clearPersistence(): void {
    this.eventRepository.delete();
  }

  private async createOpponentTurn(): Promise<GameEvent> {
    const player = GamePlayer.Opponent;
    const { difficulty } = this.game;
    const attemptsLimit = CommandsService.DIFFICULTY_RESULT_LIMITS[difficulty];
    const context = this.game.createGeneratorContext(this.identityService);
    let bestResult: GameGeneratorResult | null = null;
    let bestScore = -1;
    let attemptsCount = 0;
    for await (const result of GameTurnGenerator.execute(context, player, () => this.schedulingService.yield())) {
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
        this.game.resignMatchForCurrentPlayer();
        return { type: GameEventType.MatchFinished, winner: GamePlayer.User };
      }
      this.game.passTurnForCurrentPlayer();
      return { player: GamePlayer.Opponent, type: GameEventType.TurnPassed };
    }
    const { score, words } = this.game.applyGeneratedTurn(bestResult);
    return { player: GamePlayer.Opponent, score, type: GameEventType.TurnSaved, words };
  }

  private async ensureMinimumDuration<T>(callback: () => Promise<T> | T): Promise<T> {
    const startTime = this.schedulingService.getCurrentTime();
    const result = await callback();
    const elapsed = this.schedulingService.getCurrentTime() - startTime;
    const delay = CommandsService.OPPONENT_RESPONSE_MIN_TIME - elapsed;
    if (delay > 0) await this.schedulingService.wait(delay);
    return result;
  }

  private async executeOpponentTurn(): Promise<AppTurnResponse> {
    const event = await this.ensureMinimumDuration(() => this.createOpponentTurn());
    let response: AppTurnResponse;
    switch (event.type) {
      case GameEventType.MatchFinished:
        response = { ok: true, value: { words: [] } };
        break;
      case GameEventType.TurnPassed:
        response = { ok: true, value: { words: [] } };
        break;
      case GameEventType.TurnSaved:
        if (!this.inventoryView.hasTilesFor(GamePlayer.Opponent)) this.game.finishMatchByScore();
        response = { ok: true, value: { words: event.words } };
        break;
      default:
        throw new ReferenceError(`Unexpected event type: ${(event as { type: string }).type}`);
    }
    if (this.game.matchView.isFinished) {
      this.clearPersistence();
    } else {
      this.syncPersistence();
    }
    return response;
  }

  private saveTurnForCurrentPlayer(): AppTurnResponse {
    if (!this.game.turnsView.currentTurnIsValid) return { error: 'Turn is not valid', ok: false };
    const { words } = this.game.saveTurnForCurrentPlayer();
    return { ok: true, value: { words } };
  }

  private syncPersistence(): void {
    this.eventRepository.save(this.game.eventLogView);
  }
}
