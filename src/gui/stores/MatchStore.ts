import Game from '@/application/index.ts';
import { GameCell, GameTile, GameState, SaveTurnResult } from '@/application/types.ts';
import { Action } from '@/domain/models/ActionTracker.ts';
import { DomainEvent } from '@/domain/events.ts';
import { defineStore } from 'pinia';
import { computed, Ref, shallowRef } from 'vue';
import SoundPlayer, { Sound } from '@/infrastructure/SoundPlayer.ts';

let game: Game;

export async function startGame(): Promise<void> {
  game = await Game.start();
}

export default class MatchStore {
  private static readonly EVENT_SOUNDS: Record<DomainEvent, Sound> = {
    [DomainEvent.TilePlaced]: Sound.ActionNeutral,
    [DomainEvent.TileUndoPlaced]: Sound.ActionNeutralReverse,
    [DomainEvent.TurnSaved]: Sound.ActionGood,
    [DomainEvent.TurnPassed]: Sound.ActionBad,
    [DomainEvent.TilesShuffled]: Sound.ActionMix,
    [DomainEvent.GameWon]: Sound.EndGood,
    [DomainEvent.GameTied]: Sound.EndNeutral,
    [DomainEvent.GameLost]: Sound.EndBad,
    [DomainEvent.OpponentTurnGenerated]: Sound.OpponentAction,
  };

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
      isCellLastConnectionInTurn: store.isCellLastConnectionInTurn.bind(store),
      wasTileUsedInPreviousTurn: store.wasTileUsedInPreviousTurn.bind(store),
      shuffleUserTiles: store.shuffleUserTiles.bind(store),
      placeTile: store.placeTile.bind(store),
      undoPlaceTile: store.undoPlaceTile.bind(store),
      resetTurn: store.resetTurn.bind(store),
      saveTurn: store.saveTurn.bind(store),
      passTurn: store.passTurn.bind(store),
      resignGame: store.resignGame.bind(store),
      actionLog: store.state.actionLog,
    };
  });

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
    return this.state.voidRefBefore(() => this.game.findTileByCell(cell));
  }

  private findCellWithTile(tile: GameTile): GameCell | undefined {
    return this.state.voidRefBefore(() => this.game.findCellByTile(tile));
  }

  private isTilePlaced(tile: GameTile): boolean {
    return this.state.voidRefBefore(() => this.game.isTilePlaced(tile));
  }

  private areTilesSame(firstTile: GameTile, secondTile: GameTile): boolean {
    return this.game.areTilesSame(firstTile, secondTile);
  }

  private getTileLetter(tile: GameTile): string {
    return this.game.getTileLetter(tile);
  }

  private isCellLastConnectionInTurn(cell: GameCell): boolean {
    return this.state.voidRefBefore(() => this.game.isCellLastConnectionInTurn(cell));
  }

  private wasTileUsedInPreviousTurn(tile: GameTile): boolean {
    return this.state.voidRefBefore(() => this.game.wasTileUsedInPreviousTurn(tile));
  }

  private shuffleUserTiles(): void {
    this.state.triggerRefAfter(() => this.game.shuffleUserTiles());
    this.handleEvents();
  }

  private placeTile(args: { cell: GameCell; tile: GameTile }): void {
    this.state.triggerRefAfter(() => this.game.placeTile(args));
    this.handleEvents();
  }

  private undoPlaceTile(tile: GameTile): void {
    this.state.triggerRefAfter(() => this.game.undoPlaceTile(tile));
    this.handleEvents();
  }

  private resetTurn(): void {
    this.state.triggerRefAfter(() => this.game.resetTurn());
  }

  private saveTurn(): { result: SaveTurnResult; opponentTurn?: Promise<SaveTurnResult> } {
    const { result, opponentTurn } = this.state.triggerRefAfter(() => this.game.saveTurn());
    this.handleEvents();
    const resolved = opponentTurn?.then((opponentResult: SaveTurnResult) => {
      this.state.refreshState();
      this.handleEvents();
      return opponentResult;
    });
    return { result, opponentTurn: resolved };
  }

  private passTurn(): { opponentTurn?: Promise<SaveTurnResult> } {
    const { opponentTurn } = this.state.triggerRefAfter(() => this.game.passTurn());
    this.handleEvents();
    const resolved = opponentTurn?.then((opponentResult: SaveTurnResult) => {
      this.state.refreshState();
      this.handleEvents();
      return opponentResult;
    });
    return { opponentTurn: resolved };
  }

  private resignGame(): void {
    this.state.triggerRefAfter(() => this.game.resignGame());
    this.handleEvents();
  }

  private handleEvents(): void {
    for (const event of this.game.drainEvents()) this.soundPlayer.play(MatchStore.EVENT_SOUNDS[event]);
  }

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
    readonly actionLog = computed<ReadonlyArray<Action>>(() => {
      void this.stateRef.value;
      return [...this.game.actionLog];
    });

    private readonly stateRef: Ref<GameState>;

    constructor(private readonly game: Game) {
      this.stateRef = shallowRef(this.game.state);
    }

    private get state(): GameState {
      return this.stateRef.value;
    }

    voidRefBefore<T>(callback: () => T): T {
      void this.stateRef.value;
      return callback();
    }

    triggerRefAfter<T>(callback: () => T): T {
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
  };
}
