import Game from '@/application/index.ts';
import { GameCell, GameTile, GameState, SaveTurnResult } from '@/application/types.ts';
import { DomainEvent } from '@/domain/events.ts';
import { defineStore } from 'pinia';
import { computed, Ref, shallowRef } from 'vue';
import SoundPlayer, { Sound } from '@/infrastructure/SoundPlayer.ts';

let game: Game;

export async function startGame(): Promise<void> {
  game = await Game.start();
}

export default class MatchStore {
  private static readonly soundPlayer = new SoundPlayer();

  private static readonly eventSounds: Record<DomainEvent, Sound> = {
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

  static readonly getInstance = defineStore('game', () => {
    const state = new MatchStore.ReactiveState(game);
    return {
      bonuses: Game.bonuses,
      letters: Game.letters,
      layoutCells: game.layoutCells,
      gameIsFinished: state.isFinished,
      tilesRemaining: state.tilesRemaining,
      userTiles: state.userTiles,
      currentTurnScore: state.currentTurnScore,
      userScore: state.userScore,
      opponentScore: state.opponentScore,
      currentPlayerIsUser: state.currentPlayerIsUser,
      userPassWillBeResign: state.userPassWillBeResign,
      isCellInCenterOfLayout: (cell: GameCell) => game.isCellInCenterOfLayout(cell),
      getCellBonus: (cell: GameCell) => game.getCellBonus(cell),
      findTileOnCell: (cell: GameCell) => state.voidRefBefore(() => game.findTileByCell(cell)),
      findCellWithTile: (tile: GameTile) => state.voidRefBefore(() => game.findCellByTile(tile)),
      isTilePlaced: (tile: GameTile) => state.voidRefBefore(() => game.isTilePlaced(tile)),
      areTilesSame: (firstTile: GameTile, secondTile: GameTile) => game.areTilesSame(firstTile, secondTile),
      getTileLetter: (tile: GameTile) => game.getTileLetter(tile),
      isCellLastConnectionInTurn: (cell: GameCell) => state.voidRefBefore(() => game.isCellLastConnectionInTurn(cell)),
      wasTileUsedInPreviousTurn: (tile: GameTile) => state.voidRefBefore(() => game.wasTileUsedInPreviousTurn(tile)),
      shuffleUserTiles: () => {
        state.triggerRefAfter(() => game.shuffleUserTiles());
        this.handleEvents();
      },
      placeTile: (args: { cell: GameCell; tile: GameTile }) => {
        state.triggerRefAfter(() => game.placeTile(args));
        this.handleEvents();
      },
      undoPlaceTile: (tile: GameTile) => {
        state.triggerRefAfter(() => game.undoPlaceTile(tile));
        this.handleEvents();
      },
      resetTurn: () => state.triggerRefAfter(() => game.resetTurn()),
      saveTurn: (): { result: SaveTurnResult; opponentTurn?: Promise<SaveTurnResult> } => {
        const { result, opponentTurn } = state.triggerRefAfter(() => game.saveTurn());
        this.handleEvents();
        const resolved = opponentTurn?.then(opponentResult => {
          state.refreshState();
          this.handleEvents();
          return opponentResult;
        });
        return { result, opponentTurn: resolved };
      },
      passTurn: (): { opponentTurn?: Promise<SaveTurnResult> } => {
        const { opponentTurn } = state.triggerRefAfter(() => game.passTurn());
        this.handleEvents();
        const resolved = opponentTurn?.then(opponentResult => {
          state.refreshState();
          this.handleEvents();
          return opponentResult;
        });
        return { opponentTurn: resolved };
      },
      resignGame: () => {
        state.triggerRefAfter(() => game.resignGame());
        this.handleEvents();
      },
    };
  });

  private static handleEvents(): void {
    for (const event of game.drainEvents()) this.soundPlayer.play(this.eventSounds[event]);
  }

  private static ReactiveState = class {
    readonly isFinished = computed(() => this.state.isFinished);
    readonly tilesRemaining = computed(() => this.state.tilesRemaining);
    readonly userTiles = computed(() => this.state.userTiles);
    readonly currentTurnScore = computed(() => this.state.currentTurnScore);
    readonly userScore = computed(() => this.state.userScore);
    readonly opponentScore = computed(() => this.state.opponentScore);
    readonly currentPlayerIsUser = computed(() => this.state.currentPlayerIsUser);
    readonly userPassWillBeResign = computed(() => this.state.userPassWillBeResign);

    private readonly stateRef: Ref<GameState>;

    constructor(private readonly game: Game) {
      this.stateRef = shallowRef(this.game.state);
    }

    private get state(): GameState {
      return this.stateRef.value;
    }

    // Read the shallowRef to register a reactive dependency before
    // calling into the imperative Game object.
    voidRefBefore<T>(callback: () => T): T {
      void this.stateRef.value;
      return callback();
    }

    // Re-assign the shallowRef after mutation to trigger reactive
    // updates in all dependents.
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
