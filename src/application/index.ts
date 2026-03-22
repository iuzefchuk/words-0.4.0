import Domain from '@/domain/index.ts';
import { DomainEvent, DomainEventCollector } from '@/domain/types.ts';
import {
  AppPlayer,
  AppLetter,
  AppBonus,
  AppCell,
  AppTile,
  AppTurnResult,
  AppTurnOutcomeType,
  AppTurnOutcome,
  AppState,
  AppTurnOutcomeHistory,
  AppDictionary,
} from '@/application/types.ts';
import { TIME } from '@/shared/constants.ts';
import { IdGenerator, Clock } from '@/shared/ports.ts';
import StateQuery from '@/application/queries/State.ts';
import PlaceTileCommand from '@/application/commands/PlaceTile.ts';
import SaveTurnCommand from '@/application/commands/SaveTurn.ts';
import UndoPlaceTileCommand from '@/application/commands/UndoPlaceTile.ts';
import PassTurnCommand from '@/application/commands/PassTurn.ts';
import TurnGeneratorWorker from '@/infrastructure/TurnGeneratorWorker/TurnGeneratorWorker.ts';
import { AppMatchResult } from '@/application/enums.ts';

export default class Application {
  static readonly BONUSES = AppBonus;
  static readonly LETTERS = AppLetter;
  private static readonly RESULT_EVENTS: Partial<Record<AppMatchResult, DomainEvent>> = {
    [AppMatchResult.Win]: DomainEvent.GameWon,
    [AppMatchResult.Lose]: DomainEvent.GameLost,
    [AppMatchResult.Tie]: DomainEvent.GameTied,
  };
  private static readonly OPPONENT_RESPONSE_MIN_TIME = TIME.ms_in_second * 2;
  private readonly eventCollector = new DomainEventCollector(); // TODO
  private matchResults: Map<AppPlayer, AppMatchResult | undefined> = new Map();
  private isMutable: boolean = true;

  private constructor(
    private readonly domain: Domain,
    private readonly turnGenerationWorker: TurnGeneratorWorker,
    private readonly clock: Clock,
  ) {}

  static create({
    dictionary,
    idGenerator,
    clock,
  }: {
    dictionary: AppDictionary;
    idGenerator: IdGenerator;
    clock: Clock;
  }): Application {
    const domain = Domain.create({ dictionary, idGenerator });
    const worker = new TurnGeneratorWorker();
    return new Application(domain, worker, clock);
  }

  get layoutCells(): ReadonlyArray<AppCell> {
    return this.domain.cells;
  }

  get state(): AppState {
    return StateQuery.execute(this.domain, this.isMutable, this.matchResults.get(AppPlayer.User));
  }

  get turnOutcomeHistory(): AppTurnOutcomeHistory {
    return this.domain.turnOutcomeHistory.map(outcome => {
      const isSave = outcome.type === AppTurnOutcomeType.Save;
      return {
        isSave,
        isUser: outcome.player === AppPlayer.User,
        ...(isSave && {
          words: outcome.words.join(', '),
          score: outcome.score,
        }),
      };
    });
  }

  isCellInCenterOfLayout(cell: AppCell): boolean {
    return this.domain.isCellCenter(cell);
  }

  getCellBonus(cell: AppCell): string | null {
    return this.domain.getBonusForCell(cell);
  }

  findTileByCell(cell: AppCell): AppTile | undefined {
    return this.domain.findTileByCell(cell);
  }

  findCellByTile(tile: AppTile): AppCell | undefined {
    return this.domain.findCellByTile(tile);
  }

  isTilePlaced(tile: AppTile): boolean {
    return this.domain.isTilePlaced(tile);
  }

  getCellRowIndex(cell: AppCell): number {
    return this.domain.getRowIndex(cell);
  }

  getCellColumnIndex(cell: AppCell): number {
    return this.domain.getColumnIndex(cell);
  }

  areTilesSame(firstTile: AppTile, secondTile: AppTile): boolean {
    return this.domain.areTilesEqual(firstTile, secondTile);
  }

  getTileLetter(tile: AppTile): string {
    return this.domain.getTileLetter(tile);
  }

  isCellTopRightInTurn(cell: AppCell): boolean {
    const cells = this.domain.currentTurnCells;
    if (!cells || cells.length === 0) return false;
    return cell === this.domain.findTopRightCell(cells);
  }

  wasTileUsedInPreviousTurn(tile: AppTile): boolean {
    const { previousTurnTiles } = this.domain;
    if (!previousTurnTiles) return false;
    return previousTurnTiles.includes(tile);
  }

  shuffleUserTiles(): void {
    this.ensureMutability();
    this.domain.shuffleTilesFor(AppPlayer.User);
    this.eventCollector.raise(DomainEvent.TilesShuffled);
  }

  placeTile({ cell, tile }: { cell: AppCell; tile: AppTile }): void {
    this.ensureMutability();
    PlaceTileCommand.execute(this.domain, { cell, tile });
    this.eventCollector.raise(DomainEvent.TilePlaced);
  }

  undoPlaceTile(tile: AppTile): void {
    this.ensureMutability();
    UndoPlaceTileCommand.execute(this.domain, tile);
    this.eventCollector.raise(DomainEvent.TileUndoPlaced);
  }

  resetTurn(): void {
    this.ensureMutability();
    this.domain.resetCurrentTurn();
  }

  saveTurn(): { result: AppTurnResult; opponentTurn?: Promise<AppTurnResult> } {
    this.ensureMutability();
    const player = this.domain.currentPlayer;
    const result = SaveTurnCommand.execute(this.domain);
    if (!result.ok) return { result };
    this.eventCollector.raise(DomainEvent.TurnSaved);
    this.checkTileDepletionFor(player);
    if (!this.domain.hasTilesFor(player)) return { result };
    const opponentTurn = this.domain.currentPlayer !== AppPlayer.User ? this.handleOpponentTurn() : undefined;
    return { result, opponentTurn };
  }

  passTurn(): { opponentTurn?: Promise<AppTurnResult> } {
    this.ensureMutability();
    if (this.domain.willPlayerPassBeResign(AppPlayer.User)) {
      this.resignMatch();
      return {};
    }
    this.domain.passCurrentTurn();
    this.eventCollector.raise(DomainEvent.TurnPassed);
    const opponentTurn = this.domain.currentPlayer !== AppPlayer.User ? this.handleOpponentTurn() : undefined;
    return { opponentTurn };
  }

  endMatch(winner: AppPlayer, loser: AppPlayer): void {
    this.ensureMutability();
    this.matchResults.set(winner, AppMatchResult.Win);
    this.matchResults.set(loser, AppMatchResult.Lose);
    this.logMatchEnd();
  }

  tieMatch(): void {
    this.ensureMutability();
    this.matchResults.set(this.domain.currentPlayer, AppMatchResult.Tie);
    this.matchResults.set(this.domain.nextPlayer, AppMatchResult.Tie);
    this.logMatchEnd();
  }

  resignMatch(): void {
    this.endMatch(this.domain.nextPlayer, this.domain.currentPlayer);
  }

  drainEvents(): Array<DomainEvent> {
    return this.eventCollector.drain();
  }

  private async handleOpponentTurn(): Promise<AppTurnResult> {
    const outcome = await this.ensureMinimumDuration(() => this.createOpponentTurn());
    switch (outcome.type) {
      case AppTurnOutcomeType.Resign:
        this.resignMatch();
        return { ok: true, value: { words: [] } };
      case AppTurnOutcomeType.Pass:
        this.eventCollector.raise(DomainEvent.TurnPassed);
        return { ok: true, value: { words: [] } };
      case AppTurnOutcomeType.Save:
        this.checkTileDepletionFor(AppPlayer.Opponent);
        this.eventCollector.raise(DomainEvent.OpponentTurnGenerated);
        return { ok: true, value: { words: outcome.words } };
      default:
        throw new Error(`Unexpected outcome type: ${(outcome as { type: string }).type}`);
    }
  }

  private async createOpponentTurn(): Promise<AppTurnOutcome> {
    const player = AppPlayer.Opponent;
    let generatorResult;
    try {
      generatorResult = await this.turnGenerationWorker.execute({ domain: this.domain, player });
    } catch {
      generatorResult = null;
    }
    if (generatorResult === null) {
      if (this.domain.willPlayerPassBeResign(player)) return { type: AppTurnOutcomeType.Resign, player };
      PassTurnCommand.execute(this.domain);
      return { type: AppTurnOutcomeType.Pass, player };
    }
    for (let i = 0; i < generatorResult.tiles.length; i++) {
      this.domain.placeTile({ cell: generatorResult.cells[i], tile: generatorResult.tiles[i] });
    }
    this.domain.validateCurrentTurn();
    const words = this.domain.currentTurnWords ?? [];
    const score = this.domain.currentTurnScore ?? 0;
    SaveTurnCommand.execute(this.domain);
    return { type: AppTurnOutcomeType.Save, player, words, score };
  }

  private checkTileDepletionFor(player: AppPlayer) {
    if (this.domain.hasTilesFor(player)) return;
    const scores = [this.state.userScore, this.state.opponentScore];
    const maxScore = Math.max(...scores.map(score => score));
    const scoresAreTied = scores.every(score => score === maxScore);
    if (scoresAreTied) {
      this.tieMatch();
    } else {
      const winner = maxScore === this.state.userScore ? AppPlayer.User : AppPlayer.Opponent;
      const loser = winner === AppPlayer.User ? AppPlayer.Opponent : AppPlayer.User;
      this.endMatch(winner, loser);
    }
  }

  private logMatchEnd(): void {
    const userMatchResult = this.matchResults.get(AppPlayer.User);
    if (userMatchResult === undefined) throw new Error('Match result was not logged');
    this.turnGenerationWorker.terminate();
    this.isMutable = false;
    const event = Application.RESULT_EVENTS[userMatchResult];
    if (event === undefined) throw new Error('Match result event not found');
    this.eventCollector.raise(event);
  }

  private async ensureMinimumDuration<T>(callback: () => Promise<T> | T): Promise<T> {
    const startTime = this.clock.now();
    const result = await callback();
    const elapsed = this.clock.now() - startTime;
    const delay = Application.OPPONENT_RESPONSE_MIN_TIME - elapsed;
    if (delay > 0) await this.clock.wait(delay);
    return result;
  }

  private ensureMutability(): void {
    if (!this.isMutable) throw new Error('Application is immutable');
  }
}
