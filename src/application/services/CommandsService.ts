import {
  AppTurnResponse,
  GameBoardType,
  GameCell,
  GameDifficulty,
  GameEvent,
  GameEventType,
  GameGeneratorResult,
  GameInventoryView,
  GamePlayer,
  GameTile,
} from '@/application/types/index.ts';
import { SchedulingService, WorkerService } from '@/application/types/ports.ts';
import { EventRepository } from '@/application/types/repositories.ts';
import Game from '@/domain/Game.ts';
import { TIME } from '@/shared/constants.ts';

export default class CommandsService {
  private static readonly OPPONENT_RESPONSE_MIN_TIME = TIME.ms_in_second * 2;

  private get currentPlayer(): GamePlayer {
    return this.game.turnsView.currentPlayer;
  }

  private get inventoryView(): Readonly<GameInventoryView> {
    return this.game.inventoryView;
  }

  constructor(
    private readonly game: Game,
    private readonly schedulingService: SchedulingService,
    private readonly workerService: WorkerService,
    private readonly turnGenerationTaskId: string,
    private readonly eventRepository: EventRepository,
  ) {}

  changeBoardType(boardType: GameBoardType): void {
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
    this.game.invalidateTurnForCurrentPlayer();
  }

  restartGame(): void {
    this.game.restart();
    this.clearPersistence();
  }

  undoPlaceTile(tile: GameTile): void {
    this.game.undoPlaceTile({ tile });
    this.game.invalidateTurnForCurrentPlayer();
  }

  validateAndSync(): void {
    this.game.validateTurn();
    this.syncPersistence();
  }

  private clearPersistence(): void {
    void this.eventRepository.delete();
  }

  private async createOpponentTurn(): Promise<GameEvent> {
    const player = GamePlayer.Opponent;
    const attemptsLimit = this.game.turnGenerationAttempts;
    const anchorCount = this.game.anchorCellsCount;
    const { dictionary, ...data } = this.game.createTurnGenerationContext();
    const workerInput = { attemptsLimit, buffer: dictionary.buffer, ...data, player };
    const results =
      attemptsLimit === Infinity
        ? this.createWorkerParallelStream(workerInput, anchorCount)
        : this.workerService.stream<GameGeneratorResult>(this.turnGenerationTaskId, workerInput);
    let bestResult: GameGeneratorResult | null = null;
    let bestScore = -1;
    for await (const result of results) {
      if (result.validationResult.score > bestScore) {
        bestResult = result;
        bestScore = result.validationResult.score;
      }
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

  private createWorkerParallelStream(
    workerInput: Record<string, unknown>,
    anchorCount: number,
  ): AsyncGenerator<GameGeneratorResult> {
    const workerCount = Math.min(this.workerService.getPoolSize(this.turnGenerationTaskId), anchorCount);
    if (workerCount <= 1) {
      return this.workerService.stream<GameGeneratorResult>(this.turnGenerationTaskId, workerInput);
    }
    const inputs: Array<unknown> = [];
    for (let idx = 0; idx < workerCount; idx++) {
      const offset = Math.round((anchorCount * idx) / workerCount);
      const end = Math.round((anchorCount * (idx + 1)) / workerCount);
      inputs.push({ ...workerInput, partition: { length: end - offset, offset } });
    }
    return this.workerService.streamParallel<GameGeneratorResult>(this.turnGenerationTaskId, inputs);
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
    const response = this.opponentResponseFor(event);
    if (this.game.matchView.isFinished) {
      this.clearPersistence();
    } else {
      this.syncPersistence();
    }
    return response;
  }

  private opponentResponseFor(event: GameEvent): AppTurnResponse {
    switch (event.type) {
      case GameEventType.MatchFinished:
      case GameEventType.TurnPassed:
        return { ok: true, value: { words: [] } };
      case GameEventType.TurnSaved:
        if (!this.inventoryView.hasTilesFor(GamePlayer.Opponent)) this.game.finishMatchByScore();
        return { ok: true, value: { words: event.words } };
      case GameEventType.BoardTypeChanged:
      case GameEventType.DifficultyChanged:
      case GameEventType.MatchStarted:
      case GameEventType.TilePlaced:
      case GameEventType.TileUndoPlaced:
      case GameEventType.TurnValidated:
        throw new ReferenceError(`unexpected opponent event type "${event.type}"`);
    }
  }

  private saveTurnForCurrentPlayer(): AppTurnResponse {
    if (!this.game.turnsView.currentTurnIsValid) return { error: 'Turn is not valid', ok: false };
    const { words } = this.game.saveTurnForCurrentPlayer();
    return { ok: true, value: { words } };
  }

  private syncPersistence(): void {
    void this.eventRepository.save(this.game.eventsLogView);
  }
}
