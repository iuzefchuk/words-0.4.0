import { SchedulerGateway, WorkerGateway } from '@/application/types/gateways.ts';
import {
  AppTurnResponse,
  GameCell,
  GameEvent,
  GameEventType,
  GameGeneratorResult,
  GameMatchDifficulty,
  GameMatchType,
  GamePlayer,
  GameTile,
} from '@/application/types/index.ts';
import { EventRepository, SettingsRepository } from '@/application/types/repositories.ts';
import Game from '@/domain/Game.ts';
import ShuffleService from '@/domain/services/ShuffleService.ts';

export default class CommandsService {
  private static readonly OPPONENT_RESPONSE_MIN_TIME_MS = 2_000;

  private get currentPlayer(): GamePlayer {
    return this.game.turnsView.currentPlayer;
  }

  constructor(
    private readonly game: Game,
    private readonly scheduler: SchedulerGateway,
    private readonly worker: WorkerGateway,
    private readonly turnGenerationTaskId: string,
    private readonly eventRepository: EventRepository,
    private readonly settingsRepository: SettingsRepository,
  ) {}

  changeMatchDifficulty(matchDifficulty: GameMatchDifficulty): void {
    this.game.changeMatchDifficulty(matchDifficulty);
    this.settingsRepository.save({ difficulty: matchDifficulty });
  }

  changeMatchType(matchType: GameMatchType): void {
    this.game.changeMatchType(matchType);
    this.settingsRepository.save({ type: matchType });
  }

  clearTiles(): void {
    this.game.clearTiles();
    this.syncPersistence();
  }

  handlePassTurn(): { opponentTurn: Promise<AppTurnResponse> | undefined } {
    this.clearTiles();
    this.game.passTurnForCurrentPlayer();
    if (this.game.matchView.isFinished) {
      this.clearPersistence();
      return { opponentTurn: undefined };
    }
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
    const userResponse = this.saveTurnForCurrentPlayer();
    if (!userResponse.ok) {
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

  shuffleUserTiles(tiles: Array<GameTile>): void {
    ShuffleService.shuffle({ array: tiles });
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
    const { crossCheckTable, dictionary, ...data } = this.game.createTurnGenerationContext();
    const workerInput = {
      attemptsLimit,
      buffer: dictionary.buffer,
      crossCheckBuffer: crossCheckTable.buffer,
      ...data,
      player,
    };
    const results =
      attemptsLimit === Infinity
        ? this.createWorkerParallelStream(workerInput, anchorCount)
        : this.worker.stream<GameGeneratorResult>(this.turnGenerationTaskId, workerInput);
    let bestResult: GameGeneratorResult | null = null;
    let bestScore = -1;
    for await (const result of results) {
      if (result.validationResult.score > bestScore) {
        bestResult = result;
        bestScore = result.validationResult.score;
      }
    }
    if (bestResult === null) {
      this.game.passTurnForCurrentPlayer();
      if (this.game.matchView.isFinished) {
        return { type: GameEventType.MatchFinished, winner: GamePlayer.User };
      }
      return { player: GamePlayer.Opponent, type: GameEventType.TurnPassed };
    }
    const { score, words } = this.game.applyGeneratedTurn(bestResult);
    return { player: GamePlayer.Opponent, score, type: GameEventType.TurnSaved, words };
  }

  private createWorkerParallelStream(
    workerInput: Record<string, unknown>,
    anchorCount: number,
  ): AsyncGenerator<GameGeneratorResult> {
    const workerCount = Math.min(this.worker.getPoolSize(this.turnGenerationTaskId), anchorCount);
    if (workerCount <= 1) {
      return this.worker.stream<GameGeneratorResult>(this.turnGenerationTaskId, workerInput);
    }
    const inputs: Array<unknown> = [];
    for (let idx = 0; idx < workerCount; idx++) {
      const offset = Math.round((anchorCount * idx) / workerCount);
      const end = Math.round((anchorCount * (idx + 1)) / workerCount);
      inputs.push({ ...workerInput, partition: { length: end - offset, offset } });
    }
    return this.worker.streamParallel<GameGeneratorResult>(this.turnGenerationTaskId, inputs);
  }

  private async executeOpponentTurn(): Promise<AppTurnResponse> {
    const event = await this.scheduler.padTo(CommandsService.OPPONENT_RESPONSE_MIN_TIME_MS, () => this.createOpponentTurn());
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
        return { ok: true, value: { words: event.words } };
      case GameEventType.MatchDifficultyChanged:
      case GameEventType.MatchStarted:
      case GameEventType.MatchTypeChanged:
      case GameEventType.TilePlaced:
      case GameEventType.TileUndoPlaced:
      case GameEventType.TurnValidationSet:
        throw new ReferenceError(`unexpected opponent event type "${event.type}"`);
    }
  }

  private saveTurnForCurrentPlayer(): AppTurnResponse {
    if (!this.game.turnsView.currentTurnIsValid) return { error: 'Turn is not valid', ok: false };
    const { words } = this.game.saveTurnForCurrentPlayer();
    return { ok: true, value: { words } };
  }

  private syncPersistence(): void {
    void this.eventRepository.append(this.game.eventsLogView);
  }
}
