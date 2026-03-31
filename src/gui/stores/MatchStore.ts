import { defineStore } from 'pinia';
import { computed, markRaw, ref } from 'vue';
import Application from '@/application/index.ts';
import {
  AppCommands,
  AppQueries,
  GameBonusDistribution,
  GameCell,
  GameSettings,
  GameTile,
} from '@/application/types.ts';
import { DEFAULT_SETTINGS, GAME_EVENT_SOUNDS } from '@/gui/constants.ts';
import LocalStorage from '@/gui/services/LocalStorage.ts';
import SoundPlayer from '@/gui/services/SoundPlayer.ts';

export default class MatchStore {
  static readonly INSTANCE = defineStore('match', () => {
    const store = new MatchStore(MatchStore.app);
    return {
      ...MatchStore.app.config,
      ...store.queries,
      ...store.commands,
    };
  });

  private static app: Application;
  private readonly queries: MatchQueries;
  private readonly commands: MatchCommands;

  private constructor(app: Application) {
    const matchState = new MatchState();
    this.queries = new MatchQueries(app.queries, matchState);
    this.commands = new MatchCommands(app.commands, matchState);
  }

  static async start(): Promise<void> {
    const settings = MatchStore.loadSettings();
    MatchStore.app = markRaw(await Application.create(settings));
  }

  private static loadSettings(): GameSettings {
    const cache = LocalStorage.load('settings') as Partial<GameSettings> | null;
    return cache?.bonusDistribution ? { bonusDistribution: cache.bonusDistribution } : DEFAULT_SETTINGS;
  }
}

class MatchState {
  private readonly boardVersion = ref(0);
  private readonly stateVersion = ref(0);

  readState<T>(fn: () => T): T {
    void this.stateVersion.value;
    return fn();
  }

  readBoard<T>(fn: () => T): T {
    void this.boardVersion.value;
    return fn();
  }

  writeState<T>(fn: () => T): T {
    const result = fn();
    this.sync();
    if (result instanceof Promise) {
      result.then(() => this.sync());
    }
    return result;
  }

  writeBoard<T>(fn: () => T): T {
    const result = fn();
    this.boardVersion.value++;
    return result;
  }

  sync(): void {
    this.boardVersion.value++;
    this.stateVersion.value++;
  }
}

class MatchQueries {
  readonly bonusDistribution = computed(() => this.readBoard(() => this.appQueries.getBonusDistribution()));
  readonly hasPriorTurns = computed(() => this.readState(() => this.appQueries.hasPriorTurns()));
  readonly tilesRemaining = computed(() => this.readState(() => this.appQueries.getTilesRemaining()));
  readonly userTiles = computed(() => this.readState(() => this.appQueries.getUserTiles()));
  readonly userScore = computed(() => this.readState(() => this.appQueries.getUserScore()));
  readonly opponentScore = computed(() => this.readState(() => this.appQueries.getOpponentScore()));
  readonly currentPlayerIsUser = computed(() => this.readState(() => this.appQueries.isCurrentPlayerUser()));
  readonly currentTurnScore = computed(() => this.readBoard(() => this.appQueries.getCurrentTurnScore()));
  readonly currentTurnIsValid = computed(() => this.readBoard(() => this.appQueries.isCurrentTurnValid()));
  readonly userPassWillBeResign = computed(() => this.readState(() => this.appQueries.willUserPassBeResign()));
  readonly eventLog = computed(() => this.readState(() => this.appQueries.getEventLog()));
  readonly matchIsFinished = computed(() => this.readState(() => this.appQueries.isMatchFinished()));
  readonly matchResult = computed(() => this.readState(() => this.appQueries.getMatchResult()));
  readonly currentTurnTopRightCell = computed(() => this.readBoard(() => this.appQueries.getCurrentTurnTopRightCell()));

  constructor(
    private readonly appQueries: AppQueries,
    private readonly matchState: MatchState,
  ) {}

  areTilesSame = (firstTile: GameTile, secondTile: GameTile) => this.appQueries.areTilesSame(firstTile, secondTile);
  getTileLetter = (tile: GameTile) => this.appQueries.getTileLetter(tile);
  isCellCenter = (cell: GameCell) => this.appQueries.isCellCenter(cell);
  getCellBonus = (cell: GameCell) => this.readBoard(() => this.appQueries.getCellBonus(cell));
  getCellRowIndex = (cell: GameCell) => this.appQueries.getCellRowIndex(cell);
  getCellColumnIndex = (cell: GameCell) => this.appQueries.getCellColumnIndex(cell);
  findTileOnCell = (cell: GameCell) => this.readBoard(() => this.appQueries.findTileOnCell(cell));
  findCellWithTile = (tile: GameTile) => this.readBoard(() => this.appQueries.findCellWithTile(tile));
  isTilePlaced = (tile: GameTile) => this.readBoard(() => this.appQueries.isTilePlaced(tile));
  isCellTopRightInCurrentTurn = (cell: GameCell) =>
    this.readBoard(() => this.appQueries.isCellTopRightInCurrentTurn(cell));
  wasTileUsedInPreviousTurn = (tile: GameTile) => this.readBoard(() => this.appQueries.wasTileUsedInPreviousTurn(tile));

  private readBoard<T>(fn: () => T): T {
    return this.matchState.readBoard(fn);
  }

  private readState<T>(fn: () => T): T {
    return this.matchState.readState(fn);
  }
}

class MatchCommands {
  constructor(
    private readonly appCommands: AppCommands,
    private readonly matchState: MatchState,
  ) {}

  changeBonusDistribution = (bonusDistribution: GameBonusDistribution): void => {
    LocalStorage.save('settings', { bonusDistribution });
    return this.matchState.writeBoard(() => this.appCommands.changeBonusDistribution(bonusDistribution));
  };

  placeTile = (args: { cell: GameCell; tile: GameTile }): void => {
    return this.writeBoardAndPlaySound(() => this.appCommands.placeTile(args));
  };

  undoPlaceTile = (tile: GameTile): void => {
    return this.writeBoardAndPlaySound(() => this.appCommands.undoPlaceTile(tile));
  };

  clearTiles = (): void => {
    return this.matchState.writeBoard(() => this.appCommands.clearTiles());
  };

  save = (): void => {
    const { opponentTurn } = this.writeStateAndPlaySound(() => this.appCommands.handleSaveTurn());
    opponentTurn?.then(() => this.syncAndPlaySound());
  };

  pass = (): void => {
    const { opponentTurn } = this.writeStateAndPlaySound(() => this.appCommands.handlePassTurn());
    opponentTurn?.then(() => this.syncAndPlaySound());
  };

  resign = (): void => {
    return this.writeStateAndPlaySound(() => this.appCommands.handleResignMatch());
  };

  private syncAndPlaySound(): void {
    this.matchState.sync();
    this.playPendingSounds();
  }

  private writeBoardAndPlaySound<CallbackResponse>(callback: () => CallbackResponse): CallbackResponse {
    const response = this.matchState.writeBoard(callback);
    this.playPendingSounds();
    return response;
  }

  private writeStateAndPlaySound<CallbackResponse>(callback: () => CallbackResponse): CallbackResponse {
    const response = this.matchState.writeState(callback);
    this.playPendingSounds();
    return response;
  }

  private playPendingSounds(): void {
    for (const event of this.appCommands.clearAllEvents()) {
      const sound = GAME_EVENT_SOUNDS[event.type];
      if (sound) SoundPlayer.play(sound);
    }
  }
}
