import { AppConfig, AppState, AppTurnResponse, AppTurnResolution } from '@/application/types.ts';
import Domain from '@/domain/index.ts';
import {
  DomainPlayer,
  DomainCell,
  DomainTile,
  DomainEvent,
  DomainTurnResolutionType,
  DomainTurnResolution,
} from '@/domain/types.ts';
import Infrastructure from '@/infrastructure/index.ts';
import { TIME } from '@/shared/constants.ts';
import { Clock, Scheduler } from '@/shared/ports.ts';

export default class Application {
  private static readonly OPPONENT_RESPONSE_MIN_TIME = TIME.ms_in_second * 2;

  private constructor(
    private readonly domain: Domain,
    private readonly clock: Clock,
    private readonly scheduler: Scheduler,
  ) {}

  static async create(): Promise<Application> {
    const { dictionary, idGenerator, clock, scheduler } = await Infrastructure.createAppDependencies();
    const domain = Domain.create(dictionary, idGenerator);
    return new Application(domain, clock, scheduler);
  }

  get config(): AppConfig {
    return this.domain.config;
  }

  get state(): AppState {
    return {
      tilesRemaining: this.domain.state.unusedTilesCount,
      matchIsFinished: this.domain.state.matchIsFinished,
      currentPlayerIsUser: this.domain.state.currentPlayer === DomainPlayer.User,
      currentTurnScore: this.domain.state.currentTurnScore,
      currentTurnIsValid: this.domain.state.currentTurnIsValid,
      userScore: this.domain.getScoreFor(DomainPlayer.User),
      opponentScore: this.domain.getScoreFor(DomainPlayer.Opponent),
      userPassWillBeResign: this.domain.willPlayerPassBeResign(DomainPlayer.User),
      userTiles: this.domain.getTilesFor(DomainPlayer.User),
      turnResolutionHistory: this.domain.state.turnResolutionHistory.map(r => this.simplifyTurnResolution(r)),
      matchResult: this.domain.getMatchResultFor(DomainPlayer.User),
    };
  }

  isCellInCenterOfLayout(cell: DomainCell): boolean {
    return this.domain.isCellCenter(cell);
  }

  getCellBonus(cell: DomainCell): string | null {
    return this.domain.getBonusForCell(cell);
  }

  findTileByCell(cell: DomainCell): DomainTile | undefined {
    return this.domain.findTileByCell(cell);
  }

  findCellByTile(tile: DomainTile): DomainCell | undefined {
    return this.domain.findCellByTile(tile);
  }

  isTilePlaced(tile: DomainTile): boolean {
    return this.domain.isTilePlaced(tile);
  }

  getCellRowIndex(cell: DomainCell): number {
    return this.domain.getRowIndex(cell);
  }

  getCellColumnIndex(cell: DomainCell): number {
    return this.domain.getColumnIndex(cell);
  }

  areTilesSame(firstTile: DomainTile, secondTile: DomainTile): boolean {
    return this.domain.areTilesEqual(firstTile, secondTile);
  }

  getTileLetter(tile: DomainTile): string {
    return this.domain.getTileLetter(tile);
  }

  isCellTopRightInTurn(cell: DomainCell): boolean {
    const { currentTurnCells: cells } = this.domain.state;
    if (cells === undefined || cells.length === 0) return false;
    return cell === this.domain.findTopRightCell(cells);
  }

  wasTileUsedInPreviousTurn(tile: DomainTile): boolean {
    const { previousTurnTiles: tiles } = this.domain.state;
    if (tiles === undefined || tiles.length === 0) return false;
    return tiles.includes(tile);
  }

  placeTile({ cell, tile }: { cell: DomainCell; tile: DomainTile }): void {
    this.domain.placeTile({ cell, tile });
    this.domain.validateCurrentTurn();
  }

  undoPlaceTile(tile: DomainTile): void {
    this.domain.undoPlaceTile({ tile });
    this.domain.validateCurrentTurn();
  }

  resetTurn(): void {
    this.domain.resetCurrentTurn();
  }

  handleSaveTurn(): { userResponse: AppTurnResponse; opponentTurn?: Promise<AppTurnResponse> } {
    const { currentPlayer: player } = this.domain.state;
    const userResponse = this.saveTurn();
    if (!userResponse.ok) {
      return { userResponse };
    }
    if (!this.domain.hasTilesFor(player)) {
      this.domain.endMatchByScore();
      return { userResponse };
    }
    if (this.domain.state.matchIsFinished) {
      return { userResponse };
    }
    const opponentTurn =
      this.domain.state.currentPlayer === DomainPlayer.Opponent ? this.executeOpponentTurn() : undefined;
    return { userResponse, opponentTurn };
  }

  handlePassTurn(): { opponentTurn?: Promise<AppTurnResponse> } {
    if (this.domain.willPlayerPassBeResign(DomainPlayer.User)) {
      this.domain.resignMatchForCurrentPlayer();
      return {};
    }
    this.domain.passCurrentTurn();
    const opponentTurn =
      this.domain.state.currentPlayer === DomainPlayer.Opponent ? this.executeOpponentTurn() : undefined;
    return { opponentTurn };
  }

  handleResignMatch(): void {
    this.domain.resignMatchForCurrentPlayer();
  }

  clearAllDomainEvents(): Array<DomainEvent> {
    return this.domain.clearAllEvents();
  }

  private saveTurn(): AppTurnResponse {
    if (!this.domain.state.currentTurnIsValid) return { ok: false, error: 'Turn is not valid' };
    const { words } = this.domain.saveCurrentTurn();
    return { ok: true, value: { words } };
  }

  private async executeOpponentTurn(): Promise<AppTurnResponse> {
    const resolution = await this.ensureMinimumDuration(() => this.createOpponentTurn());
    switch (resolution.type) {
      case DomainTurnResolutionType.Resign:
        this.domain.resignMatchForCurrentPlayer();
        return { ok: true, value: { words: [] } };
      case DomainTurnResolutionType.Pass:
        return { ok: true, value: { words: [] } };
      case DomainTurnResolutionType.Save:
        if (!this.domain.hasTilesFor(DomainPlayer.Opponent)) this.domain.endMatchByScore();
        return { ok: true, value: { words: resolution.words } };
      default:
        throw new Error(`Unexpected resolution type: ${(resolution as { type: string }).type}`);
    }
  }

  private async createOpponentTurn(): Promise<DomainTurnResolution> {
    const player = DomainPlayer.Opponent;
    let generatorResult = null;
    for await (const result of this.domain.generateTurnFor(player, () => this.scheduler.yield())) {
      generatorResult = result;
      break;
    }
    if (generatorResult === null) {
      if (this.domain.willPlayerPassBeResign(player)) return { type: DomainTurnResolutionType.Resign, player };
      this.domain.passCurrentTurn();
      return { type: DomainTurnResolutionType.Pass, player };
    }
    for (let i = 0; i < generatorResult.tiles.length; i++) {
      this.domain.placeTile({ cell: generatorResult.cells[i], tile: generatorResult.tiles[i] });
    }
    this.domain.validateCurrentTurn();
    const words = this.domain.state.currentTurnWords ?? [];
    const score = this.domain.state.currentTurnScore ?? 0;
    this.saveTurn();
    return { type: DomainTurnResolutionType.Save, player, words, score };
  }

  private async ensureMinimumDuration<T>(callback: () => Promise<T> | T): Promise<T> {
    const startTime = this.clock.now();
    const result = await callback();
    const elapsed = this.clock.now() - startTime;
    const delay = Application.OPPONENT_RESPONSE_MIN_TIME - elapsed;
    if (delay > 0) await this.clock.wait(delay);
    return result;
  }

  private simplifyTurnResolution(resolution: DomainTurnResolution): AppTurnResolution {
    const isSave = resolution.type === DomainTurnResolutionType.Save;
    const isUser = resolution.player === DomainPlayer.User;
    return {
      isSave,
      isUser,
      ...(isSave && {
        words: resolution.words.join(', '),
        score: resolution.score,
      }),
    };
  }
}
