import Application from '@/application/index.ts';
import { AppCell, AppTile, AppState, AppTurnResult, AppTurnOutcomeHistory } from '@/application/types.ts';
import { DomainEvent } from '@/domain/types.ts';
import { defineStore } from 'pinia';
import { computed, Ref, shallowRef } from 'vue';
import SoundPlayer, { Sound } from '@/infrastructure/SoundPlayer.ts';
import ApplicationFactory from '@/infrastructure/factories/ApplicationFactory.ts';

let application: Application;

export async function startGame(): Promise<void> {
  application = await ApplicationFactory.execute();
}

export default class MatchStore {
  static readonly INSTANCE = defineStore('game', () => {
    const store = new MatchStore(application);
    return {
      layoutCells: application.layoutCells,
      matchIsFinished: store.state.isFinished,
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
      shuffleUserTiles: store.shuffleUserTiles.bind(store),
      placeTile: store.placeTile.bind(store),
      undoPlaceTile: store.undoPlaceTile.bind(store),
      resetTurn: store.resetTurn.bind(store),
      saveTurn: store.saveTurn.bind(store),
      passTurn: store.passTurn.bind(store),
      resignGame: store.resignGame.bind(store),
      outcomeHistory: store.state.outcomeHistory,
    };
  });

  private static readonly EVENT_SOUNDS: Record<DomainEvent, Sound> = {
    [DomainEvent.TilePlaced]: Sound.ActionNeutral,
    [DomainEvent.TileUndoPlaced]: Sound.ActionNeutralReverse,
    [DomainEvent.TurnSaved]: Sound.ActionGood,
    [DomainEvent.TurnPassed]: Sound.ActionBad,
    [DomainEvent.TilesShuffled]: Sound.ActionMix,
    [DomainEvent.GameWon]: Sound.EndGood,
    [DomainEvent.GameTied]: Sound.EndNeutral,
    [DomainEvent.GameLost]: Sound.EndBad,
    [DomainEvent.OpponentTurnGenerated]: Sound.AltActionGood,
  };

  private static ReactiveState = class {
    readonly isFinished = computed(() => this.state.isFinished);
    readonly matchResult = computed(() => this.state.matchResult);
    readonly tilesRemaining = computed(() => this.state.tilesRemaining);
    readonly userTiles = computed(() => this.state.userTiles);
    readonly currentTurnScore = computed(() => this.state.currentTurnScore);
    readonly userScore = computed(() => this.state.userScore);
    readonly opponentScore = computed(() => this.state.opponentScore);
    readonly currentTurnIsValid = computed(() => this.state.currentTurnIsValid);
    readonly currentPlayerIsUser = computed(() => this.state.currentPlayerIsUser);
    readonly userPassWillBeResign = computed(() => this.state.userPassWillBeResign);
    readonly outcomeHistory = computed<AppTurnOutcomeHistory>(() => {
      void this.stateRef.value;
      return [...this.application.turnOutcomeHistory];
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

  private readonly soundPlayer = new SoundPlayer();
  private readonly state: InstanceType<typeof MatchStore.ReactiveState>;

  private constructor(private readonly application: Application) {
    this.state = new MatchStore.ReactiveState(application);
  }

  private isCellInCenterOfLayout(cell: AppCell): boolean {
    return this.application.isCellInCenterOfLayout(cell);
  }

  private getCellBonus(cell: AppCell): string | null {
    return this.application.getCellBonus(cell);
  }

  private findTileOnCell(cell: AppCell): AppTile | undefined {
    return this.state.trackDependency(() => this.application.findTileByCell(cell));
  }

  private findCellWithTile(tile: AppTile): AppCell | undefined {
    return this.state.trackDependency(() => this.application.findCellByTile(tile));
  }

  private isTilePlaced(tile: AppTile): boolean {
    return this.state.trackDependency(() => this.application.isTilePlaced(tile));
  }

  private getCellRowIndex(cell: AppCell): number {
    return this.application.getCellRowIndex(cell);
  }

  private getCellColumnIndex(cell: AppCell): number {
    return this.application.getCellColumnIndex(cell);
  }

  private areTilesSame(firstTile: AppTile, secondTile: AppTile): boolean {
    return this.application.areTilesSame(firstTile, secondTile);
  }

  private getTileLetter(tile: AppTile): string {
    return this.application.getTileLetter(tile);
  }

  private isCellTopRightInTurn(cell: AppCell): boolean {
    return this.state.trackDependency(() => this.application.isCellTopRightInTurn(cell));
  }

  private wasTileUsedInPreviousTurn(tile: AppTile): boolean {
    return this.state.trackDependency(() => this.application.wasTileUsedInPreviousTurn(tile));
  }

  private shuffleUserTiles(): void {
    this.state.mutateAndRefresh(() => this.application.shuffleUserTiles());
    this.handleEvents();
  }

  private placeTile(args: { cell: AppCell; tile: AppTile }): void {
    this.state.mutateAndRefresh(() => this.application.placeTile(args));
    this.handleEvents();
  }

  private undoPlaceTile(tile: AppTile): void {
    this.state.mutateAndRefresh(() => this.application.undoPlaceTile(tile));
    this.handleEvents();
  }

  private resetTurn(): void {
    this.state.mutateAndRefresh(() => this.application.resetTurn());
  }

  private saveTurn(): { result: AppTurnResult; opponentTurn?: Promise<AppTurnResult> } {
    const { result, opponentTurn } = this.state.mutateAndRefresh(() => this.application.saveTurn());
    this.handleEvents();
    const resolved = opponentTurn?.then((opponentResult: AppTurnResult) => {
      this.state.refreshState();
      this.handleEvents();
      return opponentResult;
    });
    return { result, opponentTurn: resolved };
  }

  private passTurn(): { opponentTurn?: Promise<AppTurnResult> } {
    const { opponentTurn } = this.state.mutateAndRefresh(() => this.application.passTurn());
    this.handleEvents();
    const resolved = opponentTurn?.then((opponentResult: AppTurnResult) => {
      this.state.refreshState();
      this.handleEvents();
      return opponentResult;
    });
    return { opponentTurn: resolved };
  }

  private resignGame(): void {
    this.state.mutateAndRefresh(() => this.application.resignMatch());
    this.handleEvents();
  }

  private handleEvents(): void {
    for (const event of this.application.drainEvents()) this.soundPlayer.play(MatchStore.EVENT_SOUNDS[event]);
  }
}
