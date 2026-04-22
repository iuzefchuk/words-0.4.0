import { defineStore } from 'pinia';
import { computed, markRaw, reactive, ref } from 'vue';
import Application from '@/application/index.ts';
import CommandsService from '@/application/services/CommandsService.ts';
import QueriesService from '@/application/services/QueriesService.ts';
import { GameCell, GameMatchDifficulty, GameMatchType, GameTile } from '@/application/types/index.ts';
import { SchedulingService } from '@/application/types/ports.ts';
import { getEventSound } from '@/interface/mappings.ts';
import SoundPlayer from '@/interface/services/SoundPlayer.ts';
import bootstrapApplication from '@/main.ts';

class Actions {
  private pendingValidationId = 0;

  constructor(
    private readonly commandsService: CommandsService,
    private readonly queriesService: QueriesService,
    private readonly schedulingService: SchedulingService,
    private readonly state: State,
  ) {}

  changeMatchDifficulty = (matchDifficulty: GameMatchDifficulty): void => {
    this.state.write(() => {
      this.commandsService.changeMatchDifficulty(matchDifficulty);
    });
  };

  changeMatchType = (matchType: GameMatchType): void => {
    this.state.writeBoard(() => {
      this.commandsService.changeMatchType(matchType);
    });
  };

  clearTiles = (): void => {
    this.state.writeBoard(() => {
      this.commandsService.clearTiles();
    });
  };

  pass = (): void => {
    const { opponentTurn } = this.writeAndPlaySound(() => this.commandsService.handlePassTurn());
    void opponentTurn?.then(() => {
      this.syncAndPlaySound();
    });
  };

  placeTile = (args: { cell: GameCell; tile: GameTile }): void => {
    this.writeBoardAndPlaySound(() => {
      this.commandsService.placeTile(args);
    }, [args.cell]);
    this.scheduleDeferredValidation();
  };

  resign = (): void => {
    this.writeAndPlaySound(() => {
      this.commandsService.handleResignMatch();
    });
  };

  restartGame = (): void => {
    this.state.write(() => {
      this.commandsService.restartGame();
    });
  };

  save = (): void => {
    const { opponentTurn } = this.writeAndPlaySound(() => this.commandsService.handleSaveTurn());
    void opponentTurn?.then(() => {
      this.syncAndPlaySound();
    });
  };

  undoPlaceTile = (tile: GameTile): void => {
    const previousCell = this.queriesService.findCellWithTile(tile);
    const affectedCells = previousCell === undefined ? undefined : [previousCell];
    this.writeBoardAndPlaySound(() => {
      this.commandsService.undoPlaceTile(tile);
    }, affectedCells);
    this.scheduleDeferredValidation();
  };

  private playPendingSounds(): void {
    for (const event of this.commandsService.drainNewEvents()) {
      const sound = getEventSound(event);
      if (sound !== null) SoundPlayer.play(sound);
    }
  }

  private readonly scheduleDeferredValidation = (): void => {
    const validationId = ++this.pendingValidationId;
    void this.schedulingService.yield().then(() => {
      if (validationId !== this.pendingValidationId) return;
      this.writeBoardAndPlaySound(() => {
        this.commandsService.validateAndSync();
      }, []);
    });
  };

  private syncAndPlaySound(): void {
    this.state.incrementVersions();
    this.playPendingSounds();
  }

  private writeAndPlaySound<CallbackResponse>(callback: () => CallbackResponse): CallbackResponse {
    const response = this.state.write(callback);
    this.playPendingSounds();
    return response;
  }

  private writeBoardAndPlaySound<CallbackResponse>(
    callback: () => CallbackResponse,
    affectedCells?: ReadonlyArray<GameCell>,
  ): CallbackResponse {
    const response = this.state.writeBoard(callback, affectedCells);
    this.playPendingSounds();
    return response;
  }
}

class Getters {
  readonly currentPlayerIsUser = computed(() => this.readState(() => this.queriesService.isCurrentPlayerUser()));

  readonly dictionaryIsReady = computed(() => this.readState(() => this.queriesService.isDictionaryReady()));

  readonly allActionsAreDisabled = computed(() => !this.currentPlayerIsUser.value || !this.dictionaryIsReady.value);

  readonly currentTurnIsValid = computed(() => this.readBoard(() => this.queriesService.isCurrentTurnValid()));

  readonly currentTurnScore = computed(() => this.readBoard(() => this.queriesService.getCurrentTurnScore()));

  readonly eventsLog = computed(() => this.readState(() => [...this.queriesService.getEventsLog()]));

  readonly hasPriorTurns = computed(() => this.readState(() => this.queriesService.hasPriorTurns()));

  readonly matchDifficulty = computed(() => this.readState(() => this.queriesService.getMatchDifficulty()));

  readonly matchIsFinished = computed(() => this.readState(() => this.queriesService.isMatchFinished()));

  readonly matchResult = computed(() => this.readState(() => this.queriesService.getMatchResult()));

  readonly matchType = computed(() => this.readBoard(() => this.queriesService.getMatchType()));

  readonly opponentScore = computed(() => this.readState(() => this.queriesService.getOpponentScore()));

  readonly settingsChangeIsAllowed = computed(() => this.readState(() => this.queriesService.settingsChangeIsAllowed()));

  readonly tilesRemaining = computed(() => this.readState(() => this.queriesService.getTilesRemaining()));

  readonly userPassWillBeResign = computed(() => this.readState(() => this.queriesService.willUserPassBeResign()));

  readonly userScore = computed(() => this.readState(() => this.queriesService.getUserScore()));

  readonly userTiles = computed(() => this.readState(() => this.queriesService.getUserTiles()));

  constructor(
    private readonly queriesService: QueriesService,
    private readonly state: State,
  ) {}

  areTilesSame = (firstTile: GameTile, secondTile: GameTile): boolean => this.queriesService.areTilesSame(firstTile, secondTile);

  findCellWithTile = (tile: GameTile): GameCell | undefined => this.readBoard(() => this.queriesService.findCellWithTile(tile));

  findTileOnCell = (cell: GameCell): GameTile | undefined => this.state.tileByCellCache.get(cell);

  getAdjacentCells = (cell: GameCell): ReadonlyArray<GameCell> => this.queriesService.getAdjacentCells(cell);

  getCellBonus = (cell: GameCell): ReturnType<QueriesService['getCellBonus']> =>
    this.readBoard(() => this.queriesService.getCellBonus(cell));

  getCellColumnIndex = (cell: GameCell): number => this.queriesService.getCellColumnIndex(cell);

  getCellRowIndex = (cell: GameCell): number => this.queriesService.getCellRowIndex(cell);

  getTileLetter = (tile: GameTile): ReturnType<QueriesService['getTileLetter']> => this.queriesService.getTileLetter(tile);

  isCellCenter = (cell: GameCell): boolean => this.queriesService.isCellCenter(cell);

  isTilePlaced = (tile: GameTile): boolean => this.readBoard(() => this.queriesService.isTilePlaced(tile));

  wasTileUsedInPreviousTurn = (tile: GameTile): boolean =>
    this.readBoard(() => this.queriesService.wasTileUsedInPreviousTurn(tile));

  private readBoard<T>(fn: () => T): T {
    return this.state.readBoard(fn);
  }

  private readState<T>(fn: () => T): T {
    return this.state.read(fn);
  }
}

class State {
  readonly tileByCellCache: Map<GameCell, GameTile> = reactive(new Map());

  private readonly boardVersion = ref(0);

  private readonly stateVersion = ref(0);

  constructor(
    private readonly findTileOnCell: (cell: GameCell) => GameTile | undefined,
    private readonly boardCells: ReadonlyArray<GameCell>,
  ) {}

  incrementVersions(): void {
    this.boardVersion.value++;
    this.stateVersion.value++;
    this.syncTileByCellCache();
  }

  read<T>(fn: () => T): T {
    void this.stateVersion.value;
    return fn();
  }

  readBoard<T>(fn: () => T): T {
    void this.boardVersion.value;
    return fn();
  }

  write<T>(fn: () => T): T {
    const result = fn();
    this.incrementVersions();
    if (result instanceof Promise) {
      void result.then(() => {
        this.incrementVersions();
      });
    }
    return result;
  }

  writeBoard<T>(fn: () => T, affectedCells?: ReadonlyArray<GameCell>): T {
    const result = fn();
    this.boardVersion.value++;
    this.syncTileByCellCache(affectedCells);
    return result;
  }

  private syncTileByCellCache(affectedCells?: ReadonlyArray<GameCell>): void {
    const cells = affectedCells ?? this.boardCells;
    for (const cell of cells) {
      const tile = this.findTileOnCell(cell);
      if (tile !== undefined) {
        if (this.tileByCellCache.get(cell) !== tile) this.tileByCellCache.set(cell, tile);
      } else if (this.tileByCellCache.has(cell)) {
        this.tileByCellCache.delete(cell);
      }
    }
  }
}

export default class MainStore {
  private static app: Application;

  static readonly INSTANCE = defineStore('main', () => {
    const store = new MainStore(MainStore.app);
    return {
      ...MainStore.app.config,
      ...(store.getters as { [K in keyof Getters]: Getters[K] }),
      ...(store.actions as { [K in keyof Actions]: Actions[K] }),
    };
  });

  private readonly actions: Actions;

  private readonly getters: Getters;

  private readonly state: State;

  private constructor(app: Application) {
    this.state = new State(cell => app.queriesService.findTileOnCell(cell), app.config.boardCells);
    this.getters = new Getters(app.queriesService, this.state);
    this.actions = new Actions(app.commandsService, app.queriesService, app.schedulingService, this.state);
    void this.state.write(() => app.loadDictionary());
  }

  static async initiate(): Promise<void> {
    MainStore.app = markRaw(await bootstrapApplication());
  }
}
