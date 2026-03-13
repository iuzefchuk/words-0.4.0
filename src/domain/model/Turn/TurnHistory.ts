import { Player } from '@/domain/enums.ts';
import { CellIndex } from '@/domain/reference/Layout/types.ts';
import { TileId } from '@/domain/model/Inventory/types.ts';
import Turn from '@/domain/model/Turn/Turn.ts';

export default class TurnHistory {
  private static readonly firstPlayer: Player = Player.User;

  private constructor(private turns: Array<Turn>) {}

  static create(): TurnHistory {
    return new TurnHistory([]);
  }

  get isEmpty(): boolean {
    return this.turns.length === 0;
  }

  get currentPlayer(): Player {
    return this.currentTurn.player;
  }

  get nextPlayer(): Player {
    if (this.turns.length === 0) return TurnHistory.firstPlayer;
    return this.currentPlayer === Player.User ? Player.Opponent : Player.User;
  }

  get currentTurn(): Turn {
    const last = this.turns.at(-1);
    if (!last) throw new Error('Current turn does not exist');
    return last;
  }

  get currentTurnCellSequence(): ReadonlyArray<CellIndex> | undefined {
    return this.currentTurn.cellSequence;
  }

  get currentTurnTileSequence(): ReadonlyArray<TileId> | undefined {
    return this.currentTurn.tileSequence;
  }

  get previousTurnTileSequence(): ReadonlyArray<TileId> | undefined {
    return this.turns.at(-2)?.tileSequence;
  }

  getScoreFor(player: Player): number {
    return this.turns.filter(t => t.player === player).reduce((sum, t) => sum + (t.score ?? 0), 0);
  }

  createNewTurnFor(player: Player): void {
    this.turns.push(Turn.create({ player }));
  }
}
