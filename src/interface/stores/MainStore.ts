import { defineStore } from 'pinia';
import { computed, ComputedRef, markRaw, reactive, ref, shallowRef, ShallowRef, watch } from 'vue';
import Application from '@/application/index.ts';
import QueriesService from '@/application/services/QueriesService.ts';
import { GameCell, GameLetter, GameMatchDifficulty, GameMatchType, GameTile } from '@/application/types/index.ts';
import launchWords from '@/index.ts';
import { getEventSound } from '@/interface/mappings.ts';
import SoundPlayer, { Sound } from '@/interface/services/SoundPlayer.ts';

class Actions {
  private lastDrainedEventCount = 0;

  private pendingValidationId = 0;

  constructor(
    private readonly state: State,
    private readonly requireApp: () => Application,
  ) {}

  changeMatchDifficulty = (matchDifficulty: GameMatchDifficulty): void => {
    this.state.write(() => {
      this.requireApp().commandsService.changeMatchDifficulty(matchDifficulty);
    });
  };

  changeMatchType = (matchType: GameMatchType): void => {
    this.state.write(() => {
      this.requireApp().commandsService.changeMatchType(matchType);
    });
  };

  clearTiles = (): void => {
    this.state.writeBoard(() => {
      this.requireApp().commandsService.clearTiles();
    });
  };

  pass = (): void => {
    const { opponentTurn } = this.writeAndPlaySound(() => this.requireApp().commandsService.handlePassTurn());
    void opponentTurn?.then(() => {
      this.syncAndPlaySound();
    });
  };

  placeTile = (args: { cell: GameCell; tile: GameTile }): void => {
    this.writeBoardAndPlaySound(() => {
      this.requireApp().commandsService.placeTile(args);
    }, [args.cell]);
    this.scheduleDeferredValidation();
  };

  resign = (): void => {
    this.writeAndPlaySound(() => {
      this.requireApp().commandsService.handleResignMatch();
    });
  };

  restartGame = (): void => {
    this.state.write(() => {
      this.requireApp().commandsService.restartGame();
    });
  };

  save = (): void => {
    const { opponentTurn } = this.writeAndPlaySound(() => this.requireApp().commandsService.handleSaveTurn());
    void opponentTurn?.then(() => {
      this.syncAndPlaySound();
    });
  };

  undoPlaceTile = (tile: GameTile): void => {
    const previousCell = this.requireApp().queriesService.findCellWithTile(tile);
    const affectedCells = previousCell === undefined ? undefined : [previousCell];
    this.writeBoardAndPlaySound(() => {
      this.requireApp().commandsService.undoPlaceTile(tile);
    }, affectedCells);
    this.scheduleDeferredValidation();
  };

  private playPendingSounds(): void {
    const log = this.requireApp().queriesService.getEventsLog();
    if (this.lastDrainedEventCount > log.length) this.lastDrainedEventCount = 0;
    let lastSound: null | Sound = null;
    for (const event of log.slice(this.lastDrainedEventCount)) {
      const sound = getEventSound(event);
      if (sound !== null) lastSound = sound;
    }
    this.lastDrainedEventCount = log.length;
    if (lastSound !== null) SoundPlayer.play(lastSound);
  }

  private readonly scheduleDeferredValidation = (): void => {
    const validationId = ++this.pendingValidationId;
    void this.requireApp()
      .scheduler.yield()
      .then(() => {
        if (validationId !== this.pendingValidationId) return;
        this.writeBoardAndPlaySound(() => {
          this.requireApp().commandsService.validateAndSync();
        }, []);
      });
  };

  private syncAndPlaySound(): void {
    this.state.incrementVersions();
    this.playPendingSounds();
  }

  private writeAndPlaySound<R>(callback: () => R): R {
    const response = this.state.write(callback);
    this.playPendingSounds();
    return response;
  }

  private writeBoardAndPlaySound<R>(callback: () => R, affectedCells?: ReadonlyArray<GameCell>): R {
    const response = this.state.writeBoard(callback, affectedCells);
    this.playPendingSounds();
    return response;
  }
}

class Getters {
  readonly currentPlayerIsUser = this.read(queries => queries.isCurrentPlayerUser());

  readonly dictionaryIsReady = this.read(queries => queries.isDictionaryReady());

  readonly allActionsAreDisabled = computed(() => !this.currentPlayerIsUser.value || !this.dictionaryIsReady.value);

  readonly currentTurnIsValid = this.readBoard(queries => queries.isCurrentTurnValid());

  readonly currentTurnScore = this.readBoard(queries => queries.getCurrentTurnScore());

  readonly eventsLog = this.read(queries => [...queries.getEventsLog()]);

  readonly hasPriorTurns = this.read(queries => queries.hasPriorTurns());

  readonly matchDifficulty = this.read(queries => queries.getMatchDifficulty());

  readonly matchIsFinished = this.read(queries => queries.isMatchFinished());

  readonly matchResult = this.read(queries => queries.getMatchResult());

  readonly matchType = this.readBoard(queries => queries.getMatchType());

  readonly opponentScore = this.read(queries => queries.getOpponentScore());

  readonly settingsChangeIsAllowed = this.read(queries => queries.settingsChangeIsAllowed());

  readonly tilesRemaining = this.read(queries => queries.getTilesRemaining());

  readonly userPassWillBeResign = this.read(queries => queries.willUserPassBeResign());

  readonly userScore = this.read(queries => queries.getUserScore());

  readonly userTiles = this.read(queries => queries.getUserTiles());

  constructor(
    private readonly state: State,
    private readonly requireApp: () => Application,
  ) {}

  areTilesSame = (firstTile: GameTile, secondTile: GameTile): boolean =>
    this.requireApp().queriesService.areTilesSame(firstTile, secondTile);

  findCellWithTile = (tile: GameTile): GameCell | undefined =>
    this.state.readBoard(() => this.requireApp().queriesService.findCellWithTile(tile));

  findTileOnCell = (cell: GameCell): GameTile | undefined => this.state.tileByCellCache.get(cell);

  getAdjacentCells = (cell: GameCell): ReadonlyArray<GameCell> => this.requireApp().queriesService.getAdjacentCells(cell);

  getCellBonus = (cell: GameCell): ReturnType<QueriesService['getCellBonus']> =>
    this.state.readBoard(() => this.requireApp().queriesService.getCellBonus(cell));

  getCellColumnIndex = (cell: GameCell): number => this.requireApp().queriesService.getCellColumnIndex(cell);

  getCellRowIndex = (cell: GameCell): number => this.requireApp().queriesService.getCellRowIndex(cell);

  getLetterPoints = (letter: GameLetter): number => this.requireApp().queriesService.getLetterPoints(letter);

  getTileLetter = (tile: GameTile): ReturnType<QueriesService['getTileLetter']> =>
    this.requireApp().queriesService.getTileLetter(tile);

  isCellCenter = (cell: GameCell): boolean => this.requireApp().queriesService.isCellCenter(cell);

  isTilePlaced = (tile: GameTile): boolean => this.state.readBoard(() => this.requireApp().queriesService.isTilePlaced(tile));

  wasTileUsedInPreviousTurn = (tile: GameTile): boolean =>
    this.state.readBoard(() => this.requireApp().queriesService.wasTileUsedInPreviousTurn(tile));

  private read<T>(fn: (queries: QueriesService) => T): ComputedRef<T> {
    return computed(() => this.state.read(() => fn(this.requireApp().queriesService)));
  }

  private readBoard<T>(fn: (queries: QueriesService) => T): ComputedRef<T> {
    return computed(() => this.state.readBoard(() => fn(this.requireApp().queriesService)));
  }
}

class State {
  readonly tileByCellCache: Map<GameCell, GameTile> = reactive(new Map());

  private readonly boardVersion = ref(0);

  private readonly stateVersion = ref(0);

  constructor(private readonly appRef: ShallowRef<Application | null>) {
    watch(
      this.appRef,
      () => {
        this.syncTileByCellCache();
      },
      { flush: 'sync', immediate: true },
    );
  }

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
      result.then(
        () => {
          this.incrementVersions();
        },
        () => {
          this.incrementVersions();
        },
      );
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
    const app = this.appRef.value;
    if (app === null) return;
    const cells = affectedCells ?? app.config.boardCells;
    for (const cell of cells) {
      const tile = app.queriesService.findTileOnCell(cell);
      if (tile !== undefined) {
        if (this.tileByCellCache.get(cell) !== tile) this.tileByCellCache.set(cell, tile);
      } else if (this.tileByCellCache.has(cell)) {
        this.tileByCellCache.delete(cell);
      }
    }
  }
}

export default class MainStore {
  private static readonly SINGLETON = new MainStore();

  static readonly INSTANCE = defineStore('main', () => {
    const { appRef, bootError, bootProgress } = MainStore.SINGLETON;
    const requireApp = (): Application => {
      if (appRef.value === null) throw new Error('MainStore: app is not ready');
      return appRef.value;
    };
    const state = new State(appRef);
    const getters = new Getters(state, requireApp);
    const actions = new Actions(state, requireApp);
    return {
      boardCells: computed(() => appRef.value?.config.boardCells ?? []),
      boardCellsPerAxis: computed(() => appRef.value?.config.boardCellsPerAxis ?? 0),
      bootError,
      bootProgress,
      tilesPerPlayer: computed(() => appRef.value?.config.tilesPerPlayer ?? 0),
      ...(getters as { [K in keyof Getters]: Getters[K] }),
      ...(actions as { [K in keyof Actions]: Actions[K] }),
    };
  });

  private readonly appRef = shallowRef<Application | null>(null);

  private readonly bootError = ref<null | string>(null);

  private readonly bootProgress = ref(0);

  static async initiate(): Promise<void> {
    const singleton = MainStore.SINGLETON;
    const { app: appPromise, bootObserver } = launchWords();
    bootObserver.observe(value => {
      singleton.bootProgress.value = value;
    });
    const app = await appPromise;
    singleton.appRef.value = markRaw(app);
    try {
      await app.bootDictionary();
    } catch (error: unknown) {
      singleton.bootError.value = error instanceof Error ? error.message : String(error);
    }
  }
}
