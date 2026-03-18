import Board from '@/domain/models/Board.ts';
import { CellIndex } from '@/domain/models/Board.ts';
import Dictionary from '@/domain/models/Dictionary.ts';
import Inventory, { TileId } from '@/domain/models/Inventory.ts';
import TurnDirector from '@/application/TurnDirector.ts';
import { Result } from '@/shared/result.ts';
import { ValidationError } from '@/domain/models/TurnHistory.ts';

export type GameContext = {
  board: Board;
  dictionary: Dictionary;
  inventory: Inventory;
  turnDirector: TurnDirector;
};

export type GameCell = CellIndex;

export type GameTile = TileId;

export type GameState = {
  isFinished: boolean;
  tilesRemaining: number;
  userTiles: ReadonlyArray<TileId>;
  currentTurnScore?: number;
  userScore: number;
  opponentScore: number;
  currentPlayerIsUser: boolean;
  userPassWillBeResign: boolean;
};

export type SaveTurnResult = Result<{ words: ReadonlyArray<string> }, ValidationError>;
