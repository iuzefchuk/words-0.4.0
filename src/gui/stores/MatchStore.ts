import { defineStore } from 'pinia';
import { computed, Ref, shallowRef } from 'vue';
import Application from '@/application/index.ts';
import { DomainCell, DomainTile, AppState, DomainMatchResult, DomainBonus, DomainLetter } from '@/application/types.ts';
import { BONUS_NAMES, EVENT_SOUNDS, LETTERS_SVG_HTML, MATCH_RESULT_TEXT } from '@/gui/constants.ts';
import SoundPlayer from '@/gui/services/SoundPlayer.ts';

let app: Application;

export async function startMatch(): Promise<void> {
  app = await Application.create();
}

export default class MatchStore {
  static readonly INSTANCE = defineStore('match', () => {
    const store = new MatchStore(app);
    return {
      ...app.config,
      ...store.state,
      ...store.queries,
      ...store.commands,
      // ui helpers
      getBonusName: store.getBonusName,
      getMatchResultText: store.getMatchResultText,
      getLetterSvgHtml: store.getLetterSvgHtml,
    };
  });

  private readonly state: MatchState;
  private readonly queries: MatchQueries;
  private readonly commands: MatchCommands;

  private constructor(app: Application) {
    this.state = new MatchState(app);
    this.queries = new MatchQueries(app, this.state);
    this.commands = new MatchCommands(app, this.state);
  }

  private getBonusName(bonus: DomainBonus): string {
    return window.t(BONUS_NAMES[bonus] ?? '');
  }

  private getMatchResultText(result: DomainMatchResult): string {
    return window.t(MATCH_RESULT_TEXT[result] ?? '');
  }

  private getLetterSvgHtml(letter: DomainLetter): string {
    return LETTERS_SVG_HTML[letter] ?? '';
  }
}

class MatchState {
  readonly matchIsFinished = computed(() => this.state.matchIsFinished);
  readonly matchResult = computed(() => this.state.matchResult);
  readonly tilesRemaining = computed(() => this.state.tilesRemaining);
  readonly userTiles = computed(() => this.state.userTiles);
  readonly currentTurnScore = computed(() => this.state.currentTurnScore);
  readonly userScore = computed(() => this.state.userScore);
  readonly opponentScore = computed(() => this.state.opponentScore);
  readonly currentTurnIsValid = computed(() => this.state.currentTurnIsValid);
  readonly currentPlayerIsUser = computed(() => this.state.currentPlayerIsUser);
  readonly userPassWillBeResign = computed(() => this.state.userPassWillBeResign);
  readonly turnResolutionHistory = computed(() => {
    void this.stateRef.value;
    return this.app.state.turnResolutionHistory;
  });

  private readonly stateRef: Ref<AppState>;

  constructor(private readonly app: Application) {
    this.stateRef = shallowRef(app.state);
  }

  read<T>(fn: () => T): T {
    void this.stateRef.value;
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
    this.stateRef.value = this.app.state;
  }

  private get state(): AppState {
    return this.stateRef.value;
  }
}

class MatchQueries {
  constructor(
    private readonly app: Application,
    private readonly state: MatchState,
  ) {}

  findTileOnCell = (cell: DomainCell) => this.state.read(() => this.app.findTileByCell(cell));
  findCellWithTile = (tile: DomainTile) => this.state.read(() => this.app.findCellByTile(tile));
  isTilePlaced = (tile: DomainTile) => this.state.read(() => this.app.isTilePlaced(tile));
  isCellTopRightInTurn = (cell: DomainCell) => this.state.read(() => this.app.isCellTopRightInTurn(cell));
  wasTileUsedInPreviousTurn = (tile: DomainTile) => this.state.read(() => this.app.wasTileUsedInPreviousTurn(tile));
  isCellInCenterOfLayout = (cell: DomainCell) => this.app.isCellInCenterOfLayout(cell);
  getCellBonus = (cell: DomainCell) => this.app.getCellBonus(cell);
  getCellRowIndex = (cell: DomainCell) => this.app.getCellRowIndex(cell);
  getCellColumnIndex = (cell: DomainCell) => this.app.getCellColumnIndex(cell);
  areTilesSame = (firstTile: DomainTile, secondTile: DomainTile) => this.app.areTilesSame(firstTile, secondTile);
  getTileLetter = (tile: DomainTile) => this.app.getTileLetter(tile);
}

class MatchCommands {
  constructor(
    private readonly app: Application,
    private readonly state: MatchState,
  ) {}

  placeTile = (args: { cell: DomainCell; tile: DomainTile }): void => {
    return this.writeAndPlaySound(() => this.app.placeTile(args));
  };

  undoPlaceTile = (tile: DomainTile): void => {
    return this.writeAndPlaySound(() => this.app.undoPlaceTile(tile));
  };

  resetTurn = (): void => {
    return this.state.write(() => this.app.resetTurn());
  };

  saveTurn = (): void => {
    const { opponentTurn } = this.writeAndPlaySound(() => this.app.handleSaveTurn());
    opponentTurn?.then(() => this.syncAndPlaySound());
  };

  passTurn = (): void => {
    const { opponentTurn } = this.writeAndPlaySound(() => this.app.handlePassTurn());
    opponentTurn?.then(() => this.syncAndPlaySound());
  };

  resignMatch = (): void => {
    return this.writeAndPlaySound(() => this.app.handleResignMatch());
  };

  private syncAndPlaySound(): void {
    this.state.sync();
    this.playPendingSounds();
  }

  private writeAndPlaySound<CallbackResponse>(callback: () => CallbackResponse): CallbackResponse {
    const response = this.state.write(callback);
    this.playPendingSounds();
    return response;
  }

  private playPendingSounds(): void {
    for (const event of this.app.clearAllDomainEvents()) {
      const sound = EVENT_SOUNDS[event];
      if (sound) SoundPlayer.play(sound);
    }
  }
}
