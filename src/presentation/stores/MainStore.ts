import { defineStore } from 'pinia';
import { computed, markRaw, ref } from 'vue';
import Application from '@/application/index.ts';
import CommandsService from '@/application/services/CommandsService.ts';
import QueriesService from '@/application/services/QueriesService.ts';
import { GameBoardType, GameCell, GameDifficulty, GameSettings, GameTile } from '@/application/types/index.ts';
import { DEFAULT_SETTINGS } from '@/presentation/constants.ts';
import { StorageKey } from '@/presentation/enums.ts';
import { getEventSound } from '@/presentation/mappings.ts';
import LocalStorage from '@/presentation/services/LocalStorage.ts';
import SoundPlayer from '@/presentation/services/SoundPlayer.ts';

class Actions {
  constructor(
    private readonly commandsService: CommandsService,
    private readonly state: State,
  ) {}

  changeBoardType = (boardType: GameBoardType): void => {
    MainStore.saveSettings({ boardType });
    return this.state.writeBoard(() => this.commandsService.changeBoardType(boardType));
  };

  changeDifficulty = (difficulty: GameDifficulty): void => {
    MainStore.saveSettings({ difficulty });
    return this.state.write(() => this.commandsService.changeDifficulty(difficulty));
  };

  clearTiles = (): void => {
    return this.state.writeBoard(() => this.commandsService.clearTiles());
  };

  pass = (): void => {
    const { opponentTurn } = this.writeAndPlaySound(() => this.commandsService.handlePassTurn());
    opponentTurn?.then(() => this.syncAndPlaySound());
  };

  placeTile = (args: { cell: GameCell; tile: GameTile }): void => {
    return this.writeBoardAndPlaySound(() => this.commandsService.placeTile(args));
  };

  resign = (): void => {
    return this.writeAndPlaySound(() => this.commandsService.handleResignMatch());
  };

  restartGame = (): void => {
    return this.state.write(() => this.commandsService.restartGame());
  };

  save = (): void => {
    const { opponentTurn } = this.writeAndPlaySound(() => this.commandsService.handleSaveTurn());
    opponentTurn?.then(() => this.syncAndPlaySound());
  };

  undoPlaceTile = (tile: GameTile): void => {
    return this.writeBoardAndPlaySound(() => this.commandsService.undoPlaceTile(tile));
  };

  private playPendingSounds(): void {
    for (const event of this.commandsService.drainNewEvents()) {
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
  readonly currentPlayerIsUser = computed(() => this.readState(() => this.queriesService.isCurrentPlayerUser()));

  readonly dictionaryIsReady = computed(() => this.readState(() => this.queriesService.isDictionaryReady()));

  readonly allActionsAreDisabled = computed(() => !this.currentPlayerIsUser.value || !this.dictionaryIsReady.value);

  readonly boardType = computed(() => this.readBoard(() => this.queriesService.getBoardType()));

  readonly currentTurnIsValid = computed(() => this.readBoard(() => this.queriesService.isCurrentTurnValid()));

  readonly currentTurnScore = computed(() => this.readBoard(() => this.queriesService.getCurrentTurnScore()));

  readonly difficulty = computed(() => this.readState(() => this.queriesService.getDifficulty()));

  readonly eventsLog = computed(() => this.readState(() => this.queriesService.getEventsLog()));

  readonly hasPriorTurns = computed(() => this.readState(() => this.queriesService.hasPriorTurns()));

  readonly matchIsFinished = computed(() => this.readState(() => this.queriesService.isMatchFinished()));

  readonly matchResult = computed(() => this.readState(() => this.queriesService.getMatchResult()));

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

  areTilesSame = (firstTile: GameTile, secondTile: GameTile) => this.queriesService.areTilesSame(firstTile, secondTile);

  calculateAdjacentCells = (cell: GameCell) => this.queriesService.calculateAdjacentCells(cell);

  findCellWithTile = (tile: GameTile) => this.readBoard(() => this.queriesService.findCellWithTile(tile));

  findTileOnCell = (cell: GameCell) => this.readBoard(() => this.queriesService.findTileOnCell(cell));

  getCellBonus = (cell: GameCell) => this.readBoard(() => this.queriesService.getCellBonus(cell));

  getCellColumnIndex = (cell: GameCell) => this.queriesService.getCellColumnIndex(cell);

  getCellRowIndex = (cell: GameCell) => this.queriesService.getCellRowIndex(cell);

  getTileLetter = (tile: GameTile) => this.queriesService.getTileLetter(tile);

  isCellCenter = (cell: GameCell) => this.queriesService.isCellCenter(cell);

  isTilePlaced = (tile: GameTile) => this.readBoard(() => this.queriesService.isTilePlaced(tile));

  wasTileUsedInPreviousTurn = (tile: GameTile) => this.readBoard(() => this.queriesService.wasTileUsedInPreviousTurn(tile));

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

  private readonly state: State;

  private constructor(app: Application) {
    this.state = new State();
    this.getters = new Getters(app.queriesService, this.state);
    this.actions = new Actions(app.commandsService, this.state);
    this.state.write(() => app.loadDictionary());
  }

  static async initiate(): Promise<void> {
    const settings = MainStore.loadSettings();
    MainStore.app = markRaw(await Application.create(settings));
  }

  static saveSettings(data: { boardType?: GameBoardType; difficulty?: GameDifficulty }): void {
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
