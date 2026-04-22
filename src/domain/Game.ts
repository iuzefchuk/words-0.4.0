import {
  GameBoardType,
  GameEventType,
  GameMatchDifficulty,
  GameMatchType,
  GamePlayer,
  GameValidationStatus,
} from '@/domain/enums.ts';
import Events from '@/domain/events/Events.ts';
import PassIsResignSpec from '@/domain/events/specifications/PassIsResignSpec.ts';
import Board from '@/domain/models/board/Board.ts';
import Dictionary from '@/domain/models/dictionary/Dictionary.ts';
import Inventory from '@/domain/models/inventory/Inventory.ts';
import Match from '@/domain/models/match/Match.ts';
import WinnerDerivationPolicy from '@/domain/models/match/policies/WinnerDerivationPolicy.ts';
import SettingsMutationSpec from '@/domain/models/turns/specifications/SettingsMutationSpec.ts';
import Turns from '@/domain/models/turns/Turns.ts';
import MatchTerminationPolicy from '@/domain/policies/MatchTerminationPolicy.ts';
import TurnGenerationService from '@/domain/services/generation/turn/TurnGenerationService.ts';
import TurnValidationService from '@/domain/services/validation/turn/TurnValidationService.ts';
import {
  GameBoardView,
  GameCell,
  GameEvent,
  GameGeneratorContext,
  GameGeneratorResult,
  GameInventoryView,
  GameMatchSettings,
  GameMatchView,
  GameTile,
  GameTurnsView,
} from '@/domain/types/index.ts';
import { IdentityService, SeedingService } from '@/domain/types/ports.ts';

export default class Game {
  private static readonly TURN_GENERATION_ATTEMPTS: Record<GameMatchDifficulty, number> = {
    [GameMatchDifficulty.High]: Infinity,
    [GameMatchDifficulty.Low]: 1,
    [GameMatchDifficulty.Medium]: 20,
  };

  get anchorCellsCount(): number {
    return this.board.calculateAnchorCells().size;
  }

  get boardView(): Readonly<GameBoardView> {
    return this.board;
  }

  get dictionaryIsDefined(): boolean {
    return this.dictionary !== undefined;
  }

  get eventsLogView(): ReadonlyArray<GameEvent> {
    return this.events.logView;
  }

  get inventoryView(): Readonly<GameInventoryView> {
    return this.inventory;
  }

  get matchView(): Readonly<GameMatchView> {
    return this.match;
  }

  get settingsChangeIsAllowed(): boolean {
    return SettingsMutationSpec.isSatisfiedBy(this.turns);
  }

  get turnGenerationAttempts(): number {
    return Game.TURN_GENERATION_ATTEMPTS[this.match.settings.difficulty];
  }

  get turnsView(): Readonly<GameTurnsView> {
    return this.turns;
  }

  private board!: Board;

  private dictionary?: Dictionary;

  private inventory!: Inventory;

  private match!: Match;

  private turns!: Turns;

  private constructor(
    private readonly events: Events,
    private readonly identityService: IdentityService,
    private readonly seedingService: SeedingService,
  ) {}

  static create(identityService: IdentityService, seedingService: SeedingService, settings: GameMatchSettings): Game {
    const seed = seedingService.createSeed();
    const event: GameEvent = { seed, settings, type: GameEventType.MatchStarted };
    const events = Events.create([event]);
    const game = new Game(events, identityService, seedingService);
    game.initialize(Game.createInitParams(seed, settings, seedingService, identityService));
    return game;
  }

  static createFromEvents(
    initialEvents: ReadonlyArray<GameEvent>,
    identityService: IdentityService,
    seedingService: SeedingService,
  ): Game {
    if (initialEvents[0] === undefined) throw new Error('cannot create game from empty events');
    const first = initialEvents[0];
    if (first.type !== GameEventType.MatchStarted) throw new Error(`expected first event to be MatchStarted, got ${first.type}`);
    const events = Events.create([...initialEvents]);
    const game = new Game(events, identityService, seedingService);
    game.initialize(Game.createInitParams(first.seed, first.settings, seedingService, identityService));
    for (let idx = 1; idx < initialEvents.length; idx++) {
      const event = initialEvents[idx];
      if (event === undefined) throw new ReferenceError(`expected event at index ${String(idx)}, got undefined`);
      game.applyToState(event);
    }
    return game;
  }

  private static createInitParams(
    seed: number,
    settings: GameMatchSettings,
    seedingService: SeedingService,
    identityService: IdentityService,
  ): { board: Board; inventory: Inventory; match: Match; turns: Turns } {
    const players = Object.values(GamePlayer);
    const randomizer = seedingService.createRandomizer(seed);
    return {
      board: Board.create(this.mapTypeFromSettingsToBoard(settings.type), randomizer),
      inventory: Inventory.create(players, randomizer),
      match: Match.create(players, settings),
      turns: Turns.create(identityService),
    };
  }

  private static mapTypeFromSettingsToBoard(matchType: GameMatchType): GameBoardType {
    return {
      [GameMatchType.Classic]: GameBoardType.Preset,
      [GameMatchType.Random]: GameBoardType.Random,
    }[matchType];
  }

  applyGeneratedTurn(result: GameGeneratorResult): { score: number; words: ReadonlyArray<string> } {
    this.ensureMutability();
    for (let idx = 0; idx < result.tiles.length; idx++) {
      const cell = result.cells[idx];
      if (cell === undefined) throw new ReferenceError(`expected cell at index ${String(idx)}, got undefined`);
      const tile = result.tiles[idx];
      if (tile === undefined) throw new ReferenceError(`expected tile at index ${String(idx)}, got undefined`);
      this.applyEvent({ cell, tile, type: GameEventType.TilePlaced });
    }
    this.applyEvent({ result: result.validationResult, type: GameEventType.TurnValidated });
    const { score } = result.validationResult;
    const { words } = this.saveTurnForCurrentPlayer();
    return { score, words };
  }

  applyToState(event: GameEvent): void {
    switch (event.type) {
      case GameEventType.MatchDifficultyChanged:
        this.match.setDifficulty(event.difficulty);
        break;
      case GameEventType.MatchFinished:
        this.applyMatchFinished(event.winner);
        break;
      case GameEventType.MatchStarted:
        throw new Error('cannot apply MatchStarted after game creation');
      case GameEventType.TilePlaced:
        this.board.placeTile(event.cell, event.tile);
        this.turns.addPlacedTile(event.tile);
        break;
      case GameEventType.MatchTypeChanged:
        this.initialize(
          Game.createInitParams(
            event.seed,
            { difficulty: this.match.settings.difficulty, type: event.matchType },
            this.seedingService,
            this.identityService,
          ),
        );
        break;
      case GameEventType.TileUndoPlaced:
        this.turns.removePlacedTile(event.tile);
        this.board.undoPlaceTile(event.tile);
        break;
      case GameEventType.TurnPassed:
        this.turns.startTurnFor(this.turns.nextPlayer);
        break;
      case GameEventType.TurnSaved:
        this.applyTurnSaved(event.player, event.score);
        break;
      case GameEventType.TurnValidated:
        this.turns.recordValidationResult(event.result);
        break;
    }
  }

  changeMatchDifficulty(matchDifficulty: GameMatchDifficulty): void {
    this.ensureMutability();
    this.ensureSettingsMutability();
    this.applyEvent({ difficulty: matchDifficulty, type: GameEventType.MatchDifficultyChanged });
  }

  changeMatchType(matchType: GameMatchType): void {
    this.ensureMutability();
    this.ensureSettingsMutability();
    const newSeed = this.seedingService.createSeed();
    this.applyEvent({ matchType, seed: newSeed, type: GameEventType.MatchTypeChanged });
  }

  clearTiles(): void {
    this.ensureMutability();
    const tiles = [...this.turns.currentTurnTiles];
    for (const tile of tiles) {
      const cell = this.board.findCellByTile(tile);
      if (cell === undefined) throw new Error(`tile ${tile} is not on the board`);
      this.applyEvent({ cell, tile, type: GameEventType.TileUndoPlaced });
    }
    this.applyEvent({ result: { status: GameValidationStatus.Unvalidated }, type: GameEventType.TurnValidated });
  }

  createTurnGenerationContext(): GameGeneratorContext {
    if (this.dictionary === undefined) throw new Error('cannot create turn generation context: dictionary is undefined');
    return TurnGenerationService.createContext(this.board, this.dictionary, this.inventory, this.turns);
  }

  finishMatchByScore(): void {
    this.ensureMutability();
    const winner = WinnerDerivationPolicy.byScore(this.match);
    this.applyEvent({ type: GameEventType.MatchFinished, winner });
  }

  invalidateTurnForCurrentPlayer(): void {
    this.applyEvent({ result: { status: GameValidationStatus.Unvalidated }, type: GameEventType.TurnValidated });
  }

  passTurnForCurrentPlayer(): void {
    this.ensureMutability();
    const player = this.turnsView.currentPlayer;
    if (PassIsResignSpec.isSatisfiedBy(this.events, player)) {
      const winner = WinnerDerivationPolicy.onResignation(player);
      this.applyEvent({ type: GameEventType.MatchFinished, winner });
      return;
    }
    this.applyEvent({ player, type: GameEventType.TurnPassed });
  }

  placeTile(input: { cell: GameCell; tile: GameTile }): void {
    this.ensureMutability();
    this.applyEvent({ cell: input.cell, tile: input.tile, type: GameEventType.TilePlaced });
  }

  resignMatchForCurrentPlayer(): void {
    this.ensureMutability();
    const winner = WinnerDerivationPolicy.onResignation(this.turnsView.currentPlayer);
    this.applyEvent({ type: GameEventType.MatchFinished, winner });
  }

  restart(): void {
    const seed = this.seedingService.createSeed();
    const settings: GameMatchSettings = { ...this.match.settings };
    const event: GameEvent = { seed, settings, type: GameEventType.MatchStarted };
    this.events.reset(event);
    this.initialize(Game.createInitParams(seed, settings, this.seedingService, this.identityService));
  }

  saveTurnForCurrentPlayer(): { words: ReadonlyArray<string> } {
    this.ensureMutability();
    if (!this.turnsView.currentTurnIsValid) throw new Error('cannot save invalid turn');
    const { currentPlayer: player, currentTurnScore: score, currentTurnWords: words } = this.turnsView;
    if (words === undefined) throw new ReferenceError('expected current turn words, got undefined');
    if (score === undefined) throw new ReferenceError('expected current turn score, got undefined');
    this.applyEvent({ player, score, type: GameEventType.TurnSaved, words });
    const decision = MatchTerminationPolicy.afterTurnSaved({
      currentPlayer: player,
      inventory: this.inventory,
      match: this.match,
    });
    if (decision.terminate) this.applyEvent({ type: GameEventType.MatchFinished, winner: decision.winner });
    return { words };
  }

  setDictionary(dictionary: Dictionary): void {
    this.dictionary = dictionary;
  }

  undoPlaceTile(input: { tile: GameTile }): void {
    this.ensureMutability();
    const cell = this.board.findCellByTile(input.tile);
    if (cell === undefined) throw new Error(`tile ${input.tile} is not on the board`);
    this.applyEvent({ cell, tile: input.tile, type: GameEventType.TileUndoPlaced });
  }

  validateTurn(): void {
    this.ensureMutability();
    if (this.dictionary === undefined) throw new Error('cannot validate turn: dictionary is undefined');
    const result = TurnValidationService.execute({
      board: this.board,
      dictionary: this.dictionary,
      inventory: this.inventory,
      turns: this.turns,
    });
    this.applyEvent({ result, type: GameEventType.TurnValidated });
  }

  wasTileUsedInPreviousTurn(tile: GameTile): boolean {
    return this.turns.previousTurnTiles?.includes(tile) ?? false;
  }

  willPassBeResignFor(player: GamePlayer): boolean {
    return PassIsResignSpec.isSatisfiedBy(this.events, player);
  }

  private applyEvent(event: GameEvent): void {
    this.applyToState(event);
    this.events.record(event);
  }

  private applyMatchFinished(winner: GamePlayer | null): void {
    if (winner === null) {
      this.match.recordTie(this.turnsView.currentPlayer, this.turnsView.nextPlayer);
      return;
    }
    const loser = WinnerDerivationPolicy.onResignation(winner);
    this.match.recordCompletion(winner, loser);
  }

  private applyTurnSaved(player: GamePlayer, score: number): void {
    const tiles = this.turns.currentTurnTiles;
    tiles.forEach(tile => {
      this.inventory.discardTile({ player, tile });
    });
    this.inventory.replenishTilesFor(player);
    this.match.incrementScore(player, score);
    this.turns.startTurnFor(this.turns.nextPlayer);
  }

  private ensureMutability(): void {
    if (this.match.isFinished) throw new Error('cannot mutate finished match');
  }

  private ensureSettingsMutability(): void {
    if (!this.settingsChangeIsAllowed) throw new Error('cannot change settings after first turn');
  }

  private initialize(params: { board: Board; inventory: Inventory; match: Match; turns: Turns }): void {
    this.board = params.board;
    this.inventory = params.inventory;
    this.match = params.match;
    this.turns = params.turns;
    this.turns.startTurnFor(this.turns.nextPlayer);
  }
}
