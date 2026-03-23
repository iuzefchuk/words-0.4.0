import Domain from '@/domain/index.ts';
import {
  AppPlayer,
  AppLetter,
  AppBonus,
  AppTurnResolutionType,
  AppCell,
  AppTile,
  AppTurnResolution,
  AppState,
  AppTurnResolutionHistory,
  AppTurnExecutionResult,
} from '@/application/types.ts';
import { MatchResult, Event, Sound } from '@/application/enums.ts';
import { MATCH_RESULT_EVENTS, DOMAIN_EVENT_SOUNDS, EVENT_SOUNDS } from '@/application/constants.ts';
import StateQuery from '@/application/queries/State.ts';
import PlaceTileCommand from '@/application/commands/PlaceTile.ts';
import SaveTurnCommand from '@/application/commands/SaveTurn.ts';
import UndoPlaceTileCommand from '@/application/commands/UndoPlaceTile.ts';
import PassTurnCommand from '@/application/commands/PassTurn.ts';
import { TIME } from '@/shared/constants.ts';
import { Clock, TurnGenerationWorker, SoundPlayer } from '@/shared/ports.ts';
import AppDependenciesFactory from '@/infrastructure/factories/AppDependenciesFactory.ts';

type AppTurnGenerationWorker = TurnGenerationWorker<AppPlayer, AppTile, AppCell>;
type AppSoundPlayer = SoundPlayer<Sound>;

export default class Application {
  static readonly BONUSES = AppBonus;
  static readonly LETTERS = AppLetter;
  private static readonly OPPONENT_RESPONSE_MIN_TIME = TIME.ms_in_second * 2;
  private readonly events: Array<Event> = [];
  private matchResults: Map<AppPlayer, MatchResult | undefined> = new Map();
  private isMutable: boolean = true;

  private constructor(
    private readonly domain: Domain,
    private readonly turnGenerationWorker: AppTurnGenerationWorker,
    private readonly clock: Clock,
    private readonly soundPlayer: AppSoundPlayer,
  ) {}

  static async create(): Promise<Application> {
    const { dictionary, idGenerator, turnGenerationWorker, clock, soundPlayer } =
      await AppDependenciesFactory.execute();
    const domain = Domain.create({ dictionary, idGenerator });
    return new Application(domain, turnGenerationWorker, clock, soundPlayer);
  }

  get layoutCells(): ReadonlyArray<AppCell> {
    return this.domain.cells;
  }

  get state(): AppState {
    return StateQuery.execute(this.domain, this.isMutable, this.matchResults.get(AppPlayer.User));
  }

  get turnResolutionHistory(): AppTurnResolutionHistory {
    return this.domain.turnResolutionHistory.map(resolution => {
      const isSave = resolution.type === AppTurnResolutionType.Save;
      return {
        isSave,
        isUser: resolution.player === AppPlayer.User,
        ...(isSave && {
          words: resolution.words.join(', '),
          score: resolution.score,
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
    this.events.push(Event.TilesShuffled);
  }

  placeTile({ cell, tile }: { cell: AppCell; tile: AppTile }): void {
    this.ensureMutability();
    PlaceTileCommand.execute(this.domain, { cell, tile });
  }

  undoPlaceTile(tile: AppTile): void {
    this.ensureMutability();
    UndoPlaceTileCommand.execute(this.domain, tile);
  }

  resetTurn(): void {
    this.ensureMutability();
    this.domain.resetCurrentTurn();
  }

  saveTurn(): { result: AppTurnExecutionResult; opponentTurn?: Promise<AppTurnExecutionResult> } {
    this.ensureMutability();
    const player = this.domain.currentPlayer;
    const result = SaveTurnCommand.execute(this.domain);
    if (!result.ok) return { result };
    this.checkTileDepletionFor(player);
    if (!this.domain.hasTilesFor(player)) return { result };
    const opponentTurn = this.domain.currentPlayer !== AppPlayer.User ? this.handleOpponentTurn() : undefined;
    return { result, opponentTurn };
  }

  passTurn(): { opponentTurn?: Promise<AppTurnExecutionResult> } {
    this.ensureMutability();
    if (this.domain.willPlayerPassBeResign(AppPlayer.User)) {
      this.resignMatch();
      return {};
    }
    this.domain.passCurrentTurn();
    const opponentTurn = this.domain.currentPlayer !== AppPlayer.User ? this.handleOpponentTurn() : undefined;
    return { opponentTurn };
  }

  endMatch(winner: AppPlayer, loser: AppPlayer): void {
    this.ensureMutability();
    this.matchResults.set(winner, MatchResult.Win);
    this.matchResults.set(loser, MatchResult.Lose);
    this.logMatchEnd();
  }

  tieMatch(): void {
    this.ensureMutability();
    this.matchResults.set(this.domain.currentPlayer, MatchResult.Tie);
    this.matchResults.set(this.domain.nextPlayer, MatchResult.Tie);
    this.logMatchEnd();
  }

  resignMatch(): void {
    this.endMatch(this.domain.nextPlayer, this.domain.currentPlayer);
  }

  playPendingSounds(): void {
    for (const event of this.domain.drainEvents()) {
      const sound = DOMAIN_EVENT_SOUNDS[event];
      if (sound) this.soundPlayer.play(sound);
    }
    for (const event of this.events) {
      const sound = EVENT_SOUNDS[event];
      if (sound) this.soundPlayer.play(sound);
    }
    this.events.length = 0;
  }

  private async handleOpponentTurn(): Promise<AppTurnExecutionResult> {
    const resolution = await this.ensureMinimumDuration(() => this.createOpponentTurn());
    switch (resolution.type) {
      case AppTurnResolutionType.Resign:
        this.resignMatch();
        return { ok: true, value: { words: [] } };
      case AppTurnResolutionType.Pass:
        return { ok: true, value: { words: [] } };
      case AppTurnResolutionType.Save:
        this.checkTileDepletionFor(AppPlayer.Opponent);
        this.events.push(Event.OpponentTurnGenerated);
        return { ok: true, value: { words: resolution.words } };
      default:
        throw new Error(`Unexpected resolution type: ${(resolution as { type: string }).type}`);
    }
  }

  private async createOpponentTurn(): Promise<AppTurnResolution> {
    const player = AppPlayer.Opponent;
    let generatorResult;
    try {
      generatorResult = await this.turnGenerationWorker.execute({ domain: this.domain, player });
    } catch {
      generatorResult = null;
    }
    if (generatorResult === null) {
      if (this.domain.willPlayerPassBeResign(player)) return { type: AppTurnResolutionType.Resign, player };
      PassTurnCommand.execute(this.domain);
      this.domain.drainEvents();
      return { type: AppTurnResolutionType.Pass, player };
    }
    for (let i = 0; i < generatorResult.tiles.length; i++) {
      this.domain.placeTile({ cell: generatorResult.cells[i], tile: generatorResult.tiles[i] });
    }
    this.domain.validateCurrentTurn();
    const words = this.domain.currentTurnWords ?? [];
    const score = this.domain.currentTurnScore ?? 0;
    SaveTurnCommand.execute(this.domain);
    this.domain.drainEvents();
    return { type: AppTurnResolutionType.Save, player, words, score };
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
    const event = MATCH_RESULT_EVENTS[userMatchResult];
    if (event === undefined) throw new Error('Match result event not found');
    this.events.push(event);
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
