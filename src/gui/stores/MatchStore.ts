import { defineStore } from 'pinia';
import { computed, markRaw, ref } from 'vue';
import Application from '@/application/index.ts';
import { AppCommands, AppQueries, GameCell, GameTile } from '@/application/types.ts';
import { GAME_EVENT_SOUNDS } from '@/gui/constants.ts';
import SoundPlayer from '@/gui/services/SoundPlayer.ts';

let app: Application;

export async function startMatch(): Promise<void> {
  app = markRaw(await Application.create());
}

export default class MatchStore {
  static readonly INSTANCE = defineStore('match', () => {
    const store = new MatchStore(app);
    return {
      ...app.config,
      ...store.queries,
      ...store.commands,
    };
  });

  private readonly queries: MatchQueries;
  private readonly commands: MatchCommands;

  private constructor(app: Application) {
    const matchState = new MatchState();
    this.queries = new MatchQueries(app.queries, matchState);
    this.commands = new MatchCommands(app.commands, matchState);
  }
}

class MatchState {
  private readonly version = ref(0);

  read<T>(fn: () => T): T {
    void this.version.value;
    return fn();
  }

  write<T>(fn: () => T): T {
    const result = fn();
    this.sync();
    if (result instanceof Promise) {
      result.then(() => this.sync());
    }
    return result;
  }

  sync(): void {
    this.version.value++;
  }
}

class MatchQueries {
  readonly tilesRemaining = computed(() => this.read(() => this.appQueries.getTilesRemaining()));
  readonly userTiles = computed(() => this.read(() => this.appQueries.getUserTiles()));
  readonly userScore = computed(() => this.read(() => this.appQueries.getUserScore()));
  readonly opponentScore = computed(() => this.read(() => this.appQueries.getOpponentScore()));
  readonly currentPlayerIsUser = computed(() => this.read(() => this.appQueries.isCurrentPlayerUser()));
  readonly currentTurnScore = computed(() => this.read(() => this.appQueries.getCurrentTurnScore()));
  readonly currentTurnIsValid = computed(() => this.read(() => this.appQueries.isCurrentTurnValid()));
  readonly userPassWillBeResign = computed(() => this.read(() => this.appQueries.willUserPassBeResign()));
  readonly eventLog = computed(() => this.read(() => this.appQueries.getEventLog()));
  readonly matchIsFinished = computed(() => this.read(() => this.appQueries.isMatchFinished()));
  readonly matchResult = computed(() => this.read(() => this.appQueries.getMatchResult()));

  constructor(
    private readonly appQueries: AppQueries,
    private readonly matchState: MatchState,
  ) {}

  areTilesSame = (firstTile: GameTile, secondTile: GameTile) => this.appQueries.areTilesSame(firstTile, secondTile);
  getTileLetter = (tile: GameTile) => this.appQueries.getTileLetter(tile);
  isCellCenter = (cell: GameCell) => this.appQueries.isCellCenter(cell);
  getCellBonus = (cell: GameCell) => this.appQueries.getCellBonus(cell);
  getCellRowIndex = (cell: GameCell) => this.appQueries.getCellRowIndex(cell);
  getCellColumnIndex = (cell: GameCell) => this.appQueries.getCellColumnIndex(cell);
  findTileOnCell = (cell: GameCell) => this.read(() => this.appQueries.findTileOnCell(cell));
  findCellWithTile = (tile: GameTile) => this.read(() => this.appQueries.findCellWithTile(tile));
  isTilePlaced = (tile: GameTile) => this.read(() => this.appQueries.isTilePlaced(tile));
  isCellTopRightInCurrentTurn = (cell: GameCell) => this.read(() => this.appQueries.isCellTopRightInCurrentTurn(cell));
  wasTileUsedInPreviousTurn = (tile: GameTile) => this.read(() => this.appQueries.wasTileUsedInPreviousTurn(tile));

  private read<T>(fn: () => T): T {
    return this.matchState.read(fn);
  }
}

class MatchCommands {
  constructor(
    private readonly appCommands: AppCommands,
    private readonly matchState: MatchState,
  ) {}

  placeTile = (args: { cell: GameCell; tile: GameTile }): void => {
    return this.writeAndPlaySound(() => this.appCommands.placeTile(args));
  };

  undoPlaceTile = (tile: GameTile): void => {
    return this.writeAndPlaySound(() => this.appCommands.undoPlaceTile(tile));
  };

  clearTiles = (): void => {
    return this.matchState.write(() => this.appCommands.clearTiles());
  };

  save = (): void => {
    const { opponentTurn } = this.writeAndPlaySound(() => this.appCommands.handleSaveTurn());
    opponentTurn?.then(() => this.syncAndPlaySound());
  };

  pass = (): void => {
    const { opponentTurn } = this.writeAndPlaySound(() => this.appCommands.handlePassTurn());
    opponentTurn?.then(() => this.syncAndPlaySound());
  };

  resign = (): void => {
    return this.writeAndPlaySound(() => this.appCommands.handleResignMatch());
  };

  private syncAndPlaySound(): void {
    this.matchState.sync();
    this.playPendingSounds();
  }

  private writeAndPlaySound<CallbackResponse>(callback: () => CallbackResponse): CallbackResponse {
    const response = this.matchState.write(callback);
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
