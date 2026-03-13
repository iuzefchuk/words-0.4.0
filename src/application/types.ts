import { Board } from '@/domain/model/Board/types.ts';
import { Dictionary } from '@/domain/reference/Dictionary/types.ts';
import { Inventory } from '@/domain/model/Inventory/types.ts';
import { CellIndex } from '@/domain/reference/Layout/types.ts';
import { TileId } from '@/domain/model/Inventory/types.ts';
import TurnKeeper from '@/application/TurnKeeper.ts';

export type GameContext = {
  board: Board;
  dictionary: Dictionary;
  inventory: Inventory;
  turnkeeper: TurnKeeper;
};

export type GameCell = CellIndex;

export type GameTile = TileId;

export type GameState = {
  isFinished: boolean;
  tilesRemaining: number;
  userTiles: ReadonlyArray<GameTile>;
  currentTurnScore?: number;
  userScore: number;
  opponentScore: number;
  currentPlayerIsUser: boolean;
  userPassWillBeResign: boolean;
};
