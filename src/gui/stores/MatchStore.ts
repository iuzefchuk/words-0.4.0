import Game from '@/application/Game.ts';
import { GameCell, GameTile, GameState, GameTurnResult } from '@/application/Game.ts';
import { TurnOutcome } from '@/domain/models/TurnTracker.ts';
import { DomainEvent } from '@/domain/events.ts';
import { defineStore } from 'pinia';
import { computed, Ref, shallowRef } from 'vue';
import SoundPlayer, { Sound } from '@/infrastructure/SoundPlayer.ts';
import GameFactory from '@/infrastructure/GameFactory.ts';

let game: Game;

export async function startGame(): Promise<void> {
  game = await GameFactory.create();
}

export default class MatchStore {
  static readonly INSTANCE = defineStore('game', () => {
    const store = new MatchStore(game);
    return {
      bonuses: Game.BONUSES,
      letters: Game.LETTERS,
      layoutCells: game.layoutCells,
      matchIsFinished: store.state.isFinished,
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
    readonly tilesRemaining = computed(() => this.state.tilesRemaining);
    readonly userTiles = computed(() => this.state.userTiles);
    readonly currentTurnScore = computed(() => this.state.currentTurnScore);
    readonly userScore = computed(() => this.state.userScore);
    readonly opponentScore = computed(() => this.state.opponentScore);
    readonly currentTurnIsValid = computed(() => this.state.currentTurnIsValid);
    readonly currentPlayerIsUser = computed(() => this.state.currentPlayerIsUser);
    readonly userPassWillBeResign = computed(() => this.state.userPassWillBeResign);
    readonly outcomeHistory = computed<ReadonlyArray<TurnOutcome>>(() => {
      void this.stateRef.value;
      return [...this.game.outcomeHistory];
    });

    private readonly stateRef: Ref<GameState>;

    constructor(private readonly game: Game) {
      this.stateRef = shallowRef(this.game.state);
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
      this.stateRef.value = this.game.state;
    }

    private get state(): GameState {
      return this.stateRef.value;
    }
  };

  private readonly soundPlayer = new SoundPlayer();
  private readonly state: InstanceType<typeof MatchStore.ReactiveState>;

  private constructor(private readonly game: Game) {
    this.state = new MatchStore.ReactiveState(game);
  }

  private isCellInCenterOfLayout(cell: GameCell): boolean {
    return this.game.isCellInCenterOfLayout(cell);
  }

  private getCellBonus(cell: GameCell): string | null {
    return this.game.getCellBonus(cell);
  }

  private findTileOnCell(cell: GameCell): GameTile | undefined {
    return this.state.trackDependency(() => this.game.findTileByCell(cell));
  }

  private findCellWithTile(tile: GameTile): GameCell | undefined {
    return this.state.trackDependency(() => this.game.findCellByTile(tile));
  }

  private isTilePlaced(tile: GameTile): boolean {
    return this.state.trackDependency(() => this.game.isTilePlaced(tile));
  }

  private areTilesSame(firstTile: GameTile, secondTile: GameTile): boolean {
    return this.game.areTilesSame(firstTile, secondTile);
  }

  private getTileLetter(tile: GameTile): string {
    return this.game.getTileLetter(tile);
  }

  private isCellTopRightInTurn(cell: GameCell): boolean {
    return this.state.trackDependency(() => this.game.isCellTopRightInTurn(cell));
  }

  private wasTileUsedInPreviousTurn(tile: GameTile): boolean {
    return this.state.trackDependency(() => this.game.wasTileUsedInPreviousTurn(tile));
  }

  private shuffleUserTiles(): void {
    this.state.mutateAndRefresh(() => this.game.shuffleUserTiles());
    this.handleEvents();
  }

  private placeTile(args: { cell: GameCell; tile: GameTile }): void {
    this.state.mutateAndRefresh(() => this.game.placeTile(args));
    this.handleEvents();
  }

  private undoPlaceTile(tile: GameTile): void {
    this.state.mutateAndRefresh(() => this.game.undoPlaceTile(tile));
    this.handleEvents();
  }

  private resetTurn(): void {
    this.state.mutateAndRefresh(() => this.game.resetTurn());
  }

  private saveTurn(): { result: GameTurnResult; opponentTurn?: Promise<GameTurnResult> } {
    const { result, opponentTurn } = this.state.mutateAndRefresh(() => this.game.saveTurn());
    this.handleEvents();
    const resolved = opponentTurn?.then((opponentResult: GameTurnResult) => {
      this.state.refreshState();
      this.handleEvents();
      return opponentResult;
    });
    return { result, opponentTurn: resolved };
  }

  private passTurn(): { opponentTurn?: Promise<GameTurnResult> } {
    const { opponentTurn } = this.state.mutateAndRefresh(() => this.game.passTurn());
    this.handleEvents();
    const resolved = opponentTurn?.then((opponentResult: GameTurnResult) => {
      this.state.refreshState();
      this.handleEvents();
      return opponentResult;
    });
    return { opponentTurn: resolved };
  }

  private resignGame(): void {
    this.state.mutateAndRefresh(() => this.game.resignGame());
    this.handleEvents();
  }

  private handleEvents(): void {
    for (const event of this.game.drainEvents()) this.soundPlayer.play(MatchStore.EVENT_SOUNDS[event]);
  }
}
