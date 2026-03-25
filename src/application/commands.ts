import {
  AppCommands,
  AppTurnResponse,
  GameCell,
  GameEvent,
  GameEventType,
  GameInventoryView,
  GamePlayer,
  GameTile,
  GameTurnGenerator,
} from '@/application/types.ts';
import Game from '@/domain/index.ts';
import { TIME } from '@/shared/constants.ts';
import { Clock, Scheduler } from '@/shared/ports.ts';

export default class AppCommandBuilder {
  private static readonly OPPONENT_RESPONSE_MIN_TIME = TIME.ms_in_second * 2;

  constructor(
    private readonly game: Game,
    private readonly clock: Clock,
    private readonly scheduler: Scheduler,
  ) {}

  get commands(): AppCommands {
    return {
      placeTile: (args: { cell: GameCell; tile: GameTile }) => this.placeTile(args),
      undoPlaceTile: (tile: GameTile) => this.undoPlaceTile(tile),
      clearTiles: () => this.game.clearTiles(),
      handleSaveTurn: () => this.handleSaveTurn(),
      handlePassTurn: () => this.handlePassTurn(),
      handleResignMatch: () => this.game.resignMatch(),
      clearAllEvents: () => this.game.clearAllEvents(),
    };
  }

  private get inventoryView(): Readonly<GameInventoryView> {
    return this.game.inventoryView;
  }

  private get currentPlayer(): GamePlayer {
    return this.game.turnView.currentPlayer;
  }

  private placeTile({ cell, tile }: { cell: GameCell; tile: GameTile }): void {
    this.game.placeTile({ cell, tile });
    this.game.validateTurn();
  }

  private undoPlaceTile(tile: GameTile): void {
    this.game.undoPlaceTile({ tile });
    this.game.validateTurn();
  }

  private handleSaveTurn(): { userResponse: AppTurnResponse; opponentTurn?: Promise<AppTurnResponse> } {
    const player = this.currentPlayer;
    const userResponse = this.saveTurn();
    if (!userResponse.ok) {
      return { userResponse };
    }
    if (!this.inventoryView.hasTilesFor(player)) {
      this.game.finishMatchByScore();
      return { userResponse };
    }
    if (this.game.matchView.matchIsFinished) {
      return { userResponse };
    }
    const opponentTurn = this.currentPlayer === GamePlayer.Opponent ? this.executeOpponentTurn() : undefined;
    return { userResponse, opponentTurn };
  }

  private handlePassTurn(): { opponentTurn?: Promise<AppTurnResponse> } {
    if (this.game.willPassBeResignFor(GamePlayer.User)) {
      this.game.resignMatch();
      return {};
    }
    this.game.passTurn();
    const opponentTurn = this.currentPlayer === GamePlayer.Opponent ? this.executeOpponentTurn() : undefined;
    return { opponentTurn };
  }

  private saveTurn(): AppTurnResponse {
    if (!this.game.turnView.currentTurnIsValid) return { ok: false, error: 'Turn is not valid' };
    const { words } = this.game.saveTurn();
    return { ok: true, value: { words } };
  }

  private async executeOpponentTurn(): Promise<AppTurnResponse> {
    const event = await this.ensureMinimumDuration(() => this.createOpponentTurn());
    switch (event.type) {
      case GameEventType.MatchLost:
        return { ok: true, value: { words: [] } };
      case GameEventType.OpponentTurnPassed:
        return { ok: true, value: { words: [] } };
      case GameEventType.OpponentTurnSaved:
        if (!this.inventoryView.hasTilesFor(GamePlayer.Opponent)) this.game.finishMatchByScore();
        return { ok: true, value: { words: event.words } };
      default:
        throw new Error(`Unexpected event type: ${(event as { type: string }).type}`);
    }
  }

  private async createOpponentTurn(): Promise<GameEvent> {
    const player = GamePlayer.Opponent;
    let generatorResult = null;
    const context = this.game.createGeneratorContext(() => this.scheduler.yield());
    for await (const result of GameTurnGenerator.execute(context, player)) {
      generatorResult = result;
      break;
    }
    if (generatorResult === null) {
      if (this.game.willPassBeResignFor(player)) {
        this.game.resignMatch();
        return { type: GameEventType.MatchLost };
      }
      this.game.passTurn();
      return { type: GameEventType.OpponentTurnPassed };
    }
    for (let i = 0; i < generatorResult.tiles.length; i++) {
      this.game.placeTile({ cell: generatorResult.cells[i], tile: generatorResult.tiles[i] });
    }
    this.game.validateTurn();
    const words = this.game.turnView.currentTurnWords ?? [];
    const score = this.game.turnView.currentTurnScore ?? 0;
    this.saveTurn();
    return { type: GameEventType.OpponentTurnSaved, words, score };
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
