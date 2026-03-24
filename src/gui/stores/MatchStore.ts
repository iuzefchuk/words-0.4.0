import { defineStore } from 'pinia';
import { computed, Ref, shallowRef } from 'vue';
import Application from '@/application/index.ts';
import { DomainCell, DomainTile, AppState, AppTurnResponse, AppTurnResolutionHistory } from '@/application/types.ts';
import AudioSoundPlayer, { Sound, EVENT_SOUNDS } from '@/gui/services/SoundPlayer.ts';

let application: Application;
const soundPlayer = new AudioSoundPlayer();

export async function startGame(): Promise<void> {
  application = await Application.create();
}

export default class MatchStore {
  static readonly INSTANCE = defineStore('game', () => {
    const store = new MatchStore(application, soundPlayer);
    return {
      bonuses: application.config.bonuses,
      letters: application.config.letters,
      boardCells: application.config.boardCells,
      matchIsFinished: store.state.matchIsFinished,
      matchResult: store.state.matchResult,
      tilesRemaining: store.state.tilesRemaining,
      userTiles: store.state.userTiles,
      currentTurnScore: store.state.currentTurnScore,
      userScore: store.state.userScore,
      opponentScore: store.state.opponentScore,
      currentTurnIsValid: store.state.currentTurnIsValid,
      currentPlayerIsUser: store.state.currentPlayerIsUser,
      userPassWillBeResign: store.state.userPassWillBeResign,
      isCellInCenterOfLayout: store.isCellInCenterOfLayout.bind(store),
      getCellBonus: store.getCellBonus.bind(store),
      findTileOnCell: store.findTileOnCell.bind(store),
      findCellWithTile: store.findCellWithTile.bind(store),
      isTilePlaced: store.isTilePlaced.bind(store),
      getCellRowIndex: store.getCellRowIndex.bind(store),
      getCellColumnIndex: store.getCellColumnIndex.bind(store),
      areTilesSame: store.areTilesSame.bind(store),
      getTileLetter: store.getTileLetter.bind(store),
      isCellTopRightInTurn: store.isCellTopRightInTurn.bind(store),
      wasTileUsedInPreviousTurn: store.wasTileUsedInPreviousTurn.bind(store),
      playSound: store.playSound.bind(store),
      placeTile: store.placeTile.bind(store),
      undoPlaceTile: store.undoPlaceTile.bind(store),
      resetTurn: store.resetTurn.bind(store),
      saveTurn: store.saveTurn.bind(store),
      passTurn: store.passTurn.bind(store),
      resignGame: store.resignGame.bind(store),
      resolutionHistory: store.state.resolutionHistory,
    };
  });

  private static StateReactivityWrapper = class {
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
    readonly resolutionHistory = computed<AppTurnResolutionHistory>(() => {
      void this.stateRef.value;
      return this.application.state.turnResolutionHistory;
    });

    private readonly stateRef: Ref<AppState>;

    constructor(private readonly application: Application) {
      this.stateRef = shallowRef(this.application.state);
    }

    trackDependency<T>(callback: () => T): T {
      void this.stateRef.value;
      return callback();
    }

    mutateAndRefresh<T>(callback: () => T): T {
      const result = callback();
      this.refreshState();
      if (result instanceof Promise) {
        result.then(() => this.refreshState());
      }
      return result;
    }

    refreshState(): void {
      this.stateRef.value = this.application.state;
    }

    private get state(): AppState {
      return this.stateRef.value;
    }
  };

  private readonly state: InstanceType<typeof MatchStore.StateReactivityWrapper>;

  private constructor(
    private readonly application: Application,
    private readonly soundPlayer: AudioSoundPlayer,
  ) {
    this.state = new MatchStore.StateReactivityWrapper(application);
  }

  private isCellInCenterOfLayout(cell: DomainCell): boolean {
    return this.application.isCellInCenterOfLayout(cell);
  }

  private getCellBonus(cell: DomainCell): string | null {
    return this.application.getCellBonus(cell);
  }

  private findTileOnCell(cell: DomainCell): DomainTile | undefined {
    return this.state.trackDependency(() => this.application.findTileByCell(cell));
  }

  private findCellWithTile(tile: DomainTile): DomainCell | undefined {
    return this.state.trackDependency(() => this.application.findCellByTile(tile));
  }

  private isTilePlaced(tile: DomainTile): boolean {
    return this.state.trackDependency(() => this.application.isTilePlaced(tile));
  }

  private getCellRowIndex(cell: DomainCell): number {
    return this.application.getCellRowIndex(cell);
  }

  private getCellColumnIndex(cell: DomainCell): number {
    return this.application.getCellColumnIndex(cell);
  }

  private areTilesSame(firstTile: DomainTile, secondTile: DomainTile): boolean {
    return this.application.areTilesSame(firstTile, secondTile);
  }

  private getTileLetter(tile: DomainTile): string {
    return this.application.getTileLetter(tile);
  }

  private isCellTopRightInTurn(cell: DomainCell): boolean {
    return this.state.trackDependency(() => this.application.isCellTopRightInTurn(cell));
  }

  private wasTileUsedInPreviousTurn(tile: DomainTile): boolean {
    return this.state.trackDependency(() => this.application.wasTileUsedInPreviousTurn(tile));
  }

  private playSound(sound: Sound): void {
    this.soundPlayer.play(sound);
  }

  private playPendingSounds(): void {
    for (const event of this.application.clearAllDomainEvents()) {
      const sound = EVENT_SOUNDS[event];
      if (sound) this.soundPlayer.play(sound);
    }
  }

  private placeTile(args: { cell: DomainCell; tile: DomainTile }): void {
    this.state.mutateAndRefresh(() => this.application.placeTile(args));
    this.playPendingSounds();
  }

  private undoPlaceTile(tile: DomainTile): void {
    this.state.mutateAndRefresh(() => this.application.undoPlaceTile(tile));
    this.playPendingSounds();
  }

  private resetTurn(): void {
    this.state.mutateAndRefresh(() => this.application.resetTurn());
  }

  private saveTurn(): { userResponse: AppTurnResponse; opponentResponse?: Promise<AppTurnResponse> } {
    const { userResponse, opponentResponse } = this.state.mutateAndRefresh(() => this.application.handleSaveTurn());
    this.playPendingSounds();
    const resolved = opponentResponse?.then((opponentResponse: AppTurnResponse) => {
      this.state.refreshState();
      this.playPendingSounds();
      return opponentResponse;
    });
    return { userResponse, opponentResponse: resolved };
  }

  private passTurn(): { opponentTurn?: Promise<AppTurnResponse> } {
    const { opponentTurn } = this.state.mutateAndRefresh(() => this.application.passTurn());
    this.playPendingSounds();
    const resolved = opponentTurn?.then((opponentResponse: AppTurnResponse) => {
      this.state.refreshState();
      this.playPendingSounds();
      return opponentResponse;
    });
    return { opponentTurn: resolved };
  }

  private resignGame(): void {
    this.state.mutateAndRefresh(() => this.application.resignMatch());
    this.playPendingSounds();
  }
}
