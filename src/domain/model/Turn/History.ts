import { Player } from '@/domain/enums.ts';
import { CellIndex } from '@/domain/reference/Layout/types.ts';
import { TileId } from '@/domain/model/Inventory/types.ts';
import { Board } from '@/domain/model/Board/types.ts';
import Turn from '@/domain/model/Turn/Turn.ts';

export default class History {
  private static readonly firstPlayer: Player = Player.User;

  private constructor(
    private turns: Array<Turn>,
    private readonly board: Board,
  ) {}

  static create(board: Board): History {
    return new History([], board);
  }

  get isEmpty(): boolean {
    return this.turns.length === 0;
  }

  get currentPlayer(): Player {
    return this.currentTurn.player;
  }

  get nextPlayer(): Player {
    if (this.turns.length === 0) return History.firstPlayer;
    return this.currentPlayer === Player.User ? Player.Opponent : Player.User;
  }

  get currentTurn(): Turn {
    const last = this.turns.at(-1);
    if (!last) throw new Error('No current turn exists');
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

  placeTile({ cell, tile }: { cell: CellIndex; tile: TileId }): void {
    this.currentTurn.placeTile({ cell, tile });
    this.board.placeTile(cell, tile);
  }

  removeTile({ tile }: { tile: TileId }): void {
    this.currentTurn.removeTile({ tile });
    this.board.removeTile(tile);
  }

  resetCurrentTurn(): void {
    for (const { tile } of this.currentTurn.links) {
      this.board.removeTile(tile);
    }
    this.currentTurn.reset();
  }

  createNewTurnFor(player: Player): void {
    this.turns.push(Turn.create({ player }));
  }
}
