import { defineStore } from 'pinia';
import { computed, markRaw, ref } from 'vue';
import Application from '@/application/index.ts';
import { AppCommands, AppQueries, GameBonusDistribution, GameCell, GameDifficulty, GameSettings, GameTile } from '@/application/types.ts';
import { DEFAULT_SETTINGS } from '@/presentation/constants.ts';
import { StorageKey } from '@/presentation/enums.ts';
import { getEventSound } from '@/presentation/mappings.ts';
import LocalStorage from '@/presentation/services/LocalStorage.ts';
import SoundPlayer from '@/presentation/services/SoundPlayer.ts';

class Actions {
  constructor(
    private readonly appCommands: AppCommands,
    private readonly state: State,
  ) {}

  changeBoardType = (boardType: GameBonusDistribution): void => {
    MainStore.saveSettings({ boardType });
    return this.state.writeBoard(() => this.appCommands.changeBoardType(boardType));
  };

  changeDifficulty = (difficulty: GameDifficulty): void => {
    MainStore.saveSettings({ difficulty });
    return this.state.write(() => this.appCommands.changeDifficulty(difficulty));
  };

  clearTiles = (): void => {
    return this.state.writeBoard(() => this.appCommands.clearTiles());
  };

  pass = (): void => {
    const { opponentTurn } = this.writeAndPlaySound(() => this.appCommands.handlePassTurn());
    opponentTurn?.then(() => this.syncAndPlaySound());
  };

  placeTile = (args: { cell: GameCell; tile: GameTile }): void => {
    return this.writeBoardAndPlaySound(() => this.appCommands.placeTile(args));
  };

  resign = (): void => {
    return this.writeAndPlaySound(() => this.appCommands.handleResignMatch());
  };

  save = (): void => {
    const { opponentTurn } = this.writeAndPlaySound(() => this.appCommands.handleSaveTurn());
    opponentTurn?.then(() => this.syncAndPlaySound());
  };

  undoPlaceTile = (tile: GameTile): void => {
    return this.writeBoardAndPlaySound(() => this.appCommands.undoPlaceTile(tile));
  };

  private playPendingSounds(): void {
    for (const event of this.appCommands.drainNewEvents()) {
      const sound = getEventSound(event);
      if (sound) SoundPlayer.play(sound);
    }
  }

  private syncAndPlaySound(): void {
    this.state.incrementVersions();
    this.playPendingSounds();
  }

  private writeAndPlaySound<CallbackResponse>(callback: () => CallbackResponse): CallbackResponse {
    const response = this.state.write(callback);
    this.playPendingSounds();
    return response;
  }

  private writeBoardAndPlaySound<CallbackResponse>(callback: () => CallbackResponse): CallbackResponse {
    const response = this.state.writeBoard(callback);
    this.playPendingSounds();
    return response;
  }
}

class Getters {
  readonly boardType = computed(() => this.readBoard(() => this.appQueries.getBoardType()));
  readonly currentPlayerIsUser = computed(() => this.readState(() => this.appQueries.isCurrentPlayerUser()));
  readonly currentTurnIsValid = computed(() => this.readBoard(() => this.appQueries.isCurrentTurnValid()));
  readonly currentTurnScore = computed(() => this.readBoard(() => this.appQueries.getCurrentTurnScore()));
  readonly difficulty = computed(() => this.readState(() => this.appQueries.getDifficulty()));
  readonly eventLog = computed(() => this.readState(() => this.appQueries.getEventLog()));
  readonly hasPriorTurns = computed(() => this.readState(() => this.appQueries.hasPriorTurns()));
  readonly matchIsFinished = computed(() => this.readState(() => this.appQueries.isMatchFinished()));
  readonly matchResult = computed(() => this.readState(() => this.appQueries.getMatchResult()));
  readonly opponentScore = computed(() => this.readState(() => this.appQueries.getOpponentScore()));
  readonly settingsChangeIsAllowed = computed(() => this.readState(() => this.appQueries.settingsChangeIsAllowed()));
  readonly tilesRemaining = computed(() => this.readState(() => this.appQueries.getTilesRemaining()));
  readonly userPassWillBeResign = computed(() => this.readState(() => this.appQueries.willUserPassBeResign()));
  readonly userScore = computed(() => this.readState(() => this.appQueries.getUserScore()));
  readonly userTiles = computed(() => this.readState(() => this.appQueries.getUserTiles()));

  constructor(
    private readonly appQueries: AppQueries,
    private readonly state: State,
  ) {}

  areTilesSame = (firstTile: GameTile, secondTile: GameTile) => this.appQueries.areTilesSame(firstTile, secondTile);
  findCellWithTile = (tile: GameTile) => this.readBoard(() => this.appQueries.findCellWithTile(tile));
  findTileOnCell = (cell: GameCell) => this.readBoard(() => this.appQueries.findTileOnCell(cell));
  getCellBonus = (cell: GameCell) => this.readBoard(() => this.appQueries.getCellBonus(cell));
  getCellColumnIndex = (cell: GameCell) => this.appQueries.getCellColumnIndex(cell);
  getCellRowIndex = (cell: GameCell) => this.appQueries.getCellRowIndex(cell);
  getTileLetter = (tile: GameTile) => this.appQueries.getTileLetter(tile);
  isCellCenter = (cell: GameCell) => this.appQueries.isCellCenter(cell);
  isTilePlaced = (tile: GameTile) => this.readBoard(() => this.appQueries.isTilePlaced(tile));
  wasTileUsedInPreviousTurn = (tile: GameTile) => this.readBoard(() => this.appQueries.wasTileUsedInPreviousTurn(tile));

  private readBoard<T>(fn: () => T): T {
    return this.state.readBoard(fn);
  }

  private readState<T>(fn: () => T): T {
    return this.state.read(fn);
  }
}

class State {
  private readonly boardVersion = ref(0);
  private readonly stateVersion = ref(0);

  incrementVersions(): void {
    this.boardVersion.value++;
    this.stateVersion.value++;
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
      result.then(() => this.incrementVersions());
    }
    return result;
  }

  writeBoard<T>(fn: () => T): T {
    const result = fn();
    this.boardVersion.value++;
    return result;
  }
}

export default class MainStore {
  private static app: Application;

  static readonly INSTANCE = defineStore('main', () => {
    const store = new MainStore(MainStore.app);
    return {
      ...MainStore.app.config,
      ...store.getters,
      ...store.actions,
    };
  });

  private readonly actions: Actions;

  private readonly getters: Getters;

  private constructor(app: Application) {
    const state = new State();
    this.getters = new Getters(app.queries, state);
    this.actions = new Actions(app.commands, state);
  }

  static async initiate(): Promise<void> {
    const settings = MainStore.loadSettings();
    MainStore.app = markRaw(await Application.create(settings));
  }

  static saveSettings(data: { boardType?: GameBonusDistribution; difficulty?: GameDifficulty }): void {
    const existingCache = this.loadSettings();
    const newCache = {
      boardType: data?.boardType ?? existingCache?.boardType,
      difficulty: data?.difficulty ?? existingCache?.difficulty,
    };
    LocalStorage.save(StorageKey.Settings, newCache);
  }

  private static loadSettings(): GameSettings {
    const cache = LocalStorage.load(StorageKey.Settings) as null | Partial<GameSettings>;
    return {
      boardType: cache?.boardType ?? DEFAULT_SETTINGS.boardType,
      difficulty: cache?.difficulty ?? DEFAULT_SETTINGS.difficulty,
    };
  }
}
