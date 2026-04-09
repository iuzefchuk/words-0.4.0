import Board from '@/domain/models/board/Board.ts';
import Dictionary from '@/domain/models/dictionary/Dictionary.ts';
import Inventory from '@/domain/models/inventory/Inventory.ts';
import Match from '@/domain/models/match/Match.ts';
import { ValidationStatus } from '@/domain/models/turns/enums.ts';
import Turns from '@/domain/models/turns/Turns.ts';
import { GeneratorContext, GeneratorResult } from '@/domain/services/turn-generation/TurnGenerationService.ts';
import TurnValidationService, { ValidatorContext } from '@/domain/services/turn-validation/TurnValidationService.ts';
import {
  GameBoardView,
  GameBonusDistribution,
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
  IdentityService,
  SeedingService,
} from '@/domain/types.ts';

class EventLog {
  get logView(): ReadonlyArray<GameEvent> {
    return [...this.log];
  }

  private constructor(
    private readonly log: Array<GameEvent>,
    private readonly pending: Array<GameEvent>,
  ) {}

  static create(initialEvents: Array<GameEvent> = []): EventLog {
    return new EventLog([...initialEvents], []);
  }

  drainPending(): Array<GameEvent> {
    const drained = [...this.pending];
    this.pending.length = 0;
    return drained;
  }

  record(event: GameEvent): void {
    this.log.push(event);
    this.pending.push(event);
  }

  reset(initialEvent: GameEvent): void {
    this.log.length = 0;
    this.log.push(initialEvent);
  }

  wasLastTurnEventPassFor(player: GamePlayer): boolean {
    for (let i = this.log.length - 1; i >= 0; i--) {
      const e = this.log[i]!;
      if (e.type === GameEventType.TurnPassed && e.player === player) return true;
      if (e.type === GameEventType.TurnSaved && e.player === player) return false;
    }
    return false;
  }
}

export default class Game {
  get boardView(): Readonly<GameBoardView> {
    return this.board;
  }

  get eventLogView(): ReadonlyArray<GameEvent> {
    return this.eventLog.logView;
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

  get turnsView(): Readonly<GameTurnsView> {
    return this.turns;
  }

  private board!: Board;

  private inventory!: Inventory;

  private match!: Match;

  private turns!: Turns;

  constructor(
    private readonly dictionary: Dictionary,
    private readonly eventLog: EventLog,
    private readonly identityService: IdentityService,
    private readonly seedingService: SeedingService,
    public difficulty: GameDifficulty,
  ) {}

  static create(identityService: IdentityService, seedingService: SeedingService, dictionary: Dictionary, settings: GameSettings): Game {
    const seed = seedingService.createSeed();
    const event: GameEvent = { seed, settings, type: GameEventType.MatchStarted };
    const eventLog = EventLog.create([event]);
    const game = new Game(dictionary, eventLog, identityService, seedingService, settings.difficulty);
    game.initialize(Game.createInitParams(seed, settings, seedingService, identityService));
    return game;
  }

  static createFromEvents(
    events: ReadonlyArray<GameEvent>,
    dictionary: Dictionary,
    identityService: IdentityService,
    seedingService: SeedingService,
  ): Game {
    if (!events[0]) throw new Error('Events have to exist');
    const first = events[0];
    if (first.type !== GameEventType.MatchStarted) throw new Error('First event must be MatchStarted');
    const eventLog = EventLog.create([...events]);
    const game = new Game(dictionary, eventLog, identityService, seedingService, first.settings.difficulty);
    game.initialize(Game.createInitParams(first.seed, first.settings, seedingService, identityService));
    for (let i = 1; i < events.length; i++) game.applyToState(events[i]!);
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
        this.turns.recordPlacedTile(event.tile);
        break;
      case GameEventType.TileUndoPlaced:
        this.turns.undoRecordPlacedTile({ tile: event.tile });
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

  changeBoardType(boardType: GameBonusDistribution): void {
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

  createGeneratorContext(identityService: IdentityService): GeneratorContext {
    return {
      board: Board.restoreFromSnapshot(this.board.snapshot),
      dictionary: this.dictionary,
      inventory: this.inventory,
      turns: Turns.restoreFromSnapshot(identityService, this.turns.snapshot),
    };
  }

  drainPendingEvents(): Array<GameEvent> {
    return this.eventLog.drainPending();
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
    this.eventLog.reset(event);
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

  undoPlaceTile(input: { tile: GameTile }): void {
    this.ensureMutability();
    const cell = this.board.findCellByTile(input.tile);
    if (cell === undefined) throw new Error(`Tile ${input.tile} is not on the board`);
    this.applyEvent({ cell, tile: input.tile, type: GameEventType.TileUndoPlaced });
  }

  validateTurn(): void {
    this.ensureMutability();
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
    return this.eventLog.wasLastTurnEventPassFor(player);
  }

  private applyEvent(event: GameEvent): void {
    this.applyToState(event);
    this.eventLog.record(event);
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
