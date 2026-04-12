import Events from '@/domain/Events.ts';
import Board from '@/domain/models/board/Board.ts';
import Dictionary from '@/domain/models/dictionary/Dictionary.ts';
import Inventory from '@/domain/models/inventory/Inventory.ts';
import Match from '@/domain/models/match/Match.ts';
import { ValidationStatus } from '@/domain/models/turns/enums.ts';
import Turns from '@/domain/models/turns/Turns.ts';
import { GeneratorContext, GeneratorResult } from '@/domain/services/turn-generation/TurnGenerationService.ts';
import TurnValidationService, { ValidatorContext } from '@/domain/services/turn-validation/TurnValidationService.ts';
import {
  GameBoardType,
  GameBoardView,
  GameCell,
  GameDifficulty,
  GameEvent,
  GameEventType,
  GameInventoryView,
  GameMatchView,
  GamePlayer,
  GameSettings,
  GameTile,
  GameTurnsView,
} from '@/domain/types/index.ts';
import { IdentityService, SeedingService } from '@/domain/types/ports.ts';

export default class Game {
  private static readonly TURN_GENERATION_ATTEMPTS: Record<GameDifficulty, number> = {
    [GameDifficulty.High]: Infinity,
    [GameDifficulty.Low]: 1,
    [GameDifficulty.Medium]: 20,
  };

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
    return !this.turns.historyHasPriorTurns;
  }

  get turnGenerationAttempts(): number {
    return Game.TURN_GENERATION_ATTEMPTS[this.difficulty];
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
    public difficulty: GameDifficulty,
  ) {}

  static create(identityService: IdentityService, seedingService: SeedingService, settings: GameSettings): Game {
    const seed = seedingService.createSeed();
    const event: GameEvent = { seed, settings, type: GameEventType.MatchStarted };
    const events = Events.create([event]);
    const game = new Game(events, identityService, seedingService, settings.difficulty);
    game.initialize(Game.createInitParams(seed, settings, seedingService, identityService));
    return game;
  }

  static createFromEvents(initialEvents: ReadonlyArray<GameEvent>, identityService: IdentityService, seedingService: SeedingService): Game {
    if (initialEvents[0] === undefined) throw new Error('Events have to exist');
    const first = initialEvents[0];
    if (first.type !== GameEventType.MatchStarted) throw new Error('First event must be MatchStarted');
    const events = Events.create([...initialEvents]);
    const game = new Game(events, identityService, seedingService, first.settings.difficulty);
    game.initialize(Game.createInitParams(first.seed, first.settings, seedingService, identityService));
    for (let i = 1; i < initialEvents.length; i++) game.applyToState(initialEvents[i]!);
    return game;
  }

  private static createInitParams(seed: number, settings: GameSettings, seedingService: SeedingService, identityService: IdentityService) {
    const players = Object.values(GamePlayer);
    const randomizer = seedingService.createRandomizer(seed);
    return {
      board: Board.create(settings.boardType, randomizer),
      inventory: Inventory.create(players, randomizer),
      match: Match.create(players),
      turns: Turns.create(identityService),
    };
  }

  applyGeneratedTurn(result: GeneratorResult): { score: number; words: ReadonlyArray<string> } {
    this.ensureMutability();
    for (let i = 0; i < result.tiles.length; i++) {
      const cell = result.cells[i];
      if (cell === undefined) throw new ReferenceError('Cell must be defined');
      const tile = result.tiles[i]!;
      this.applyEvent({ cell, tile, type: GameEventType.TilePlaced });
    }
    this.applyEvent({ result: result.validationResult, type: GameEventType.TurnValidated });
    const { score } = result.validationResult;
    const { words } = this.saveTurnForCurrentPlayer();
    return { score, words };
  }

  applyToState(event: GameEvent): void {
    switch (event.type) {
      case GameEventType.BoardTypeChanged:
        this.initialize(
          Game.createInitParams(event.seed, { boardType: event.boardType, difficulty: this.difficulty }, this.seedingService, this.identityService),
        );
        break;
      case GameEventType.DifficultyChanged:
        this.difficulty = event.difficulty;
        break;
      case GameEventType.MatchFinished:
        if (event.winner === null) {
          this.match.recordTie(this.turnsView.currentPlayer, this.turnsView.nextPlayer);
        } else {
          const loser = event.winner === GamePlayer.User ? GamePlayer.Opponent : GamePlayer.User;
          this.match.recordCompletion(event.winner, loser);
        }
        break;
      case GameEventType.MatchStarted:
        throw new Error('MatchStarted can only be applied during game creation');
      case GameEventType.TilePlaced:
        this.board.placeTile(event.cell, event.tile);
        this.turns.addPlacedTile(event.tile);
        break;
      case GameEventType.TileUndoPlaced:
        this.turns.removePlacedTile(event.tile);
        this.board.undoPlaceTile(event.tile);
        break;
      case GameEventType.TurnPassed:
        this.turns.startTurnFor(this.turns.nextPlayer);
        break;
      case GameEventType.TurnSaved: {
        const tiles = this.turns.currentTurnTiles;
        tiles.forEach(tile => this.inventory.discardTile({ player: event.player, tile }));
        this.inventory.replenishTilesFor(event.player);
        this.match.incrementScore(event.player, event.score);
        this.turns.startTurnFor(this.turns.nextPlayer);
        break;
      }
      case GameEventType.TurnValidated:
        this.turns.recordValidationResult(event.result);
        break;
    }
  }

  changeBoardType(boardType: GameBoardType): void {
    this.ensureMutability();
    this.ensureSettingsMutability();
    const newSeed = this.seedingService.createSeed();
    this.applyEvent({ boardType, seed: newSeed, type: GameEventType.BoardTypeChanged });
  }

  changeDifficulty(difficulty: GameDifficulty): void {
    this.ensureMutability();
    this.ensureSettingsMutability();
    this.applyEvent({ difficulty, type: GameEventType.DifficultyChanged });
  }

  clearTiles(): void {
    this.ensureMutability();
    const tiles = [...this.turns.currentTurnTiles];
    for (const tile of tiles) {
      const cell = this.board.findCellByTile(tile);
      if (cell === undefined) throw new Error(`Tile ${tile} is not on the board`);
      this.applyEvent({ cell, tile, type: GameEventType.TileUndoPlaced });
    }
    this.applyEvent({ result: { status: ValidationStatus.Unvalidated }, type: GameEventType.TurnValidated });
  }

  createGeneratorContext(): GeneratorContext {
    if (this.dictionary === undefined) throw new Error('Dictionary has to be defined');
    return {
      board: this.board.clone(),
      dictionary: this.dictionary,
      inventory: this.inventory,
      turns: this.turns.clone(),
    };
  }

  drainPendingEvents(): Array<GameEvent> {
    return this.events.drainPending();
  }

  finishMatchByScore(): void {
    this.ensureMutability();
    const { leaderByScore } = this.match;
    this.applyEvent({ type: GameEventType.MatchFinished, winner: leaderByScore });
  }

  passTurnForCurrentPlayer(): void {
    this.ensureMutability();
    this.applyEvent({ player: this.turnsView.currentPlayer, type: GameEventType.TurnPassed });
  }

  placeTile(input: { cell: GameCell; tile: GameTile }): void {
    this.ensureMutability();
    this.applyEvent({ cell: input.cell, tile: input.tile, type: GameEventType.TilePlaced });
  }

  resignMatchForCurrentPlayer(): void {
    this.ensureMutability();
    const winner = this.turnsView.currentPlayer === GamePlayer.User ? GamePlayer.Opponent : GamePlayer.User;
    this.applyEvent({ type: GameEventType.MatchFinished, winner });
  }

  restart(): void {
    const seed = this.seedingService.createSeed();
    const settings: GameSettings = { boardType: this.board.type, difficulty: this.difficulty };
    const event: GameEvent = { seed, settings, type: GameEventType.MatchStarted };
    this.events.reset(event);
    this.initialize(Game.createInitParams(seed, settings, this.seedingService, this.identityService));
  }

  saveTurnForCurrentPlayer(): { words: ReadonlyArray<string> } {
    this.ensureMutability();
    if (!this.turnsView.currentTurnIsValid) throw new Error('Turn is not valid');
    const { currentPlayer: player, currentTurnScore: score, currentTurnWords: words } = this.turnsView;
    if (words === undefined) throw new ReferenceError('Current turn words do not exist');
    if (score === undefined) throw new ReferenceError('Current turn score does not exist');
    this.applyEvent({ player, score, type: GameEventType.TurnSaved, words });
    return { words };
  }

  setDictionary(dictionary: Dictionary): void {
    this.dictionary = dictionary;
  }

  undoPlaceTile(input: { tile: GameTile }): void {
    this.ensureMutability();
    const cell = this.board.findCellByTile(input.tile);
    if (cell === undefined) throw new Error(`Tile ${input.tile} is not on the board`);
    this.applyEvent({ cell, tile: input.tile, type: GameEventType.TileUndoPlaced });
  }

  validateTurn(): void {
    this.ensureMutability();
    if (this.dictionary === undefined) throw new Error('Dictionary has to be defined');
    const result = TurnValidationService.execute({
      board: this.board,
      dictionary: this.dictionary,
      inventory: this.inventory,
      turns: this.turns,
    } as ValidatorContext);
    this.applyEvent({ result, type: GameEventType.TurnValidated });
  }

  wasTileUsedInPreviousTurn(tile: GameTile): boolean {
    return this.turns.previousTurnTiles?.includes(tile) ?? false;
  }

  willPassBeResignFor(player: GamePlayer): boolean {
    return this.events.wasLastTurnEventPassFor(player);
  }

  private applyEvent(event: GameEvent): void {
    this.applyToState(event);
    this.events.record(event);
  }

  private ensureMutability(): void {
    if (this.match.isFinished) throw new Error('Match is finished');
  }

  private ensureSettingsMutability(): void {
    if (!this.settingsChangeIsAllowed) throw new Error('Settings change is not allowed');
  }

  private initialize(params: { board: Board; inventory: Inventory; match: Match; turns: Turns }): void {
    this.board = params.board;
    this.inventory = params.inventory;
    this.match = params.match;
    this.turns = params.turns;
    this.turns.startTurnFor(this.turns.nextPlayer);
  }
}
